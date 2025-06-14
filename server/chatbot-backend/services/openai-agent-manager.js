const OpenAI = require('openai');
const { query, getClient } = require('../config/database');
const fs = require('fs');
const path = require('path');

class OpenAIAgentManager {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Default instructions template for new agents
    this.defaultInstructions = `You are Lisa, an expert AI assistant for train maintenance and technical support. You specialize in:

1. Train component identification and troubleshooting
2. Technical documentation and schematics
3. Maintenance procedures and safety protocols
4. SD60M locomotive systems and components
5. IETMS (Integrated Electronic Train Management System)

When users ask about train parts or request images, you can:
- Show images of specific train components
- Display technical schematics and diagrams
- Provide detailed technical information
- Guide users through maintenance procedures

You have access to:
- Train part images (alerter, distributed power, relay panels, etc.)
- SD-60 locomotive schematics (pages 13-62)
- IETMS schematics (pages 2-10)

Be helpful, professional, and safety-conscious in all responses. When showing images or schematics, provide context about what the user is viewing and any relevant technical details.

This is a personalized assistant for user ID: {USER_ID}. Maintain conversation context and provide personalized assistance.`;
  }

  // Create vector store with uploaded files
  async createVectorStoreWithFiles(files = null, name = "Lisa Train Maintenance Knowledge Base", description = "") {
    try {
      console.log('📁 Creating vector store...');
      
      // Create vector store
      const vectorStore = await this.openai.beta.vectorStores.create({
        name: name,
        expires_after: {
          anchor: "last_active_at",
          days: 90
        }
      });
      
      console.log(`✅ Vector store created: ${vectorStore.id}`);

      let uploadedFiles = [];

      // If specific files are provided, upload them
      if (files && files.length > 0) {
        console.log(`📄 Uploading ${files.length} provided files`);
        
        for (const file of files) {
          try {
            const fileStream = fs.createReadStream(file.path);
            
            const openaiFile = await this.openai.files.create({
              file: fileStream,
              purpose: 'assistants'
            });

            await this.openai.beta.vectorStores.files.create(vectorStore.id, {
              file_id: openaiFile.id
            });

            uploadedFiles.push(file.originalname);
            console.log(`✅ Uploaded: ${file.originalname}`);
          } catch (fileError) {
            console.error(`❌ Failed to upload ${file.originalname}:`, fileError.message);
          }
        }
      } else {
        // Fall back to uploads directory
        const uploadsPath = path.join(__dirname, '..', 'uploads');
        if (fs.existsSync(uploadsPath)) {
          const files = fs.readdirSync(uploadsPath);
          const supportedFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.txt', '.md', '.pdf', '.doc', '.docx'].includes(ext);
          });

          console.log(`📄 Found ${supportedFiles.length} files in uploads directory`);

          for (const fileName of supportedFiles) {
            try {
              const filePath = path.join(uploadsPath, fileName);
              const fileStream = fs.createReadStream(filePath);
              
              const openaiFile = await this.openai.files.create({
                file: fileStream,
                purpose: 'assistants'
              });

              await this.openai.beta.vectorStores.files.create(vectorStore.id, {
                file_id: openaiFile.id
              });

              uploadedFiles.push(fileName);
              console.log(`✅ Uploaded: ${fileName}`);
            } catch (fileError) {
              console.error(`❌ Failed to upload ${fileName}:`, fileError.message);
            }
          }
        }
      }

      return {
        ...vectorStore,
        uploadedFiles,
        fileCount: uploadedFiles.length
      };
    } catch (error) {
      console.error('❌ Error creating vector store:', error);
      throw error;
    }
  }

  // Create shared assistant (not user-specific)
  async createSharedAssistant(name, instructions, model = "gpt-4-1106-preview", vectorStoreId = null) {
    try {
      console.log('🤖 Creating shared OpenAI assistant...');
      
      const assistant = await this.openai.beta.assistants.create({
        name: name,
        instructions: instructions,
        model: model,
        tools: [
          { type: "file_search" },
          { type: "code_interpreter" }
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: vectorStoreId ? [vectorStoreId] : []
          }
        }
      });

      console.log(`✅ Shared assistant created: ${assistant.id}`);
      return assistant;
    } catch (error) {
      console.error('❌ Error creating shared assistant:', error);
      throw error;
    }
  }

  // Create assistant with vector store
  async createAssistant(vectorStoreId, instructions, userId) {
    try {
      console.log('🤖 Creating OpenAI assistant...');
      
      const personalizedInstructions = instructions.replace('{USER_ID}', userId);
      
      const assistant = await this.openai.beta.assistants.create({
        name: `Lisa Assistant - User ${userId}`,
        instructions: personalizedInstructions,
        model: "gpt-4-1106-preview",
        tools: [
          { type: "file_search" },
          { type: "code_interpreter" }
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: vectorStoreId ? [vectorStoreId] : []
          }
        }
      });

      console.log(`✅ Assistant created: ${assistant.id}`);
      return assistant;
    } catch (error) {
      console.error('❌ Error creating assistant:', error);
      throw error;
    }
  }

  // Create user agent (assistant + vector store)
  async createUserAgent(userId, username) {
    try {
      console.log(`🚀 Creating agent for user: ${username} (ID: ${userId})`);

      // Create vector store with files
      const vectorStore = await this.createVectorStoreWithFiles();

      // Create assistant
      const assistant = await this.createAssistant(
        vectorStore.id, 
        this.defaultInstructions, 
        userId
      );

      // Save to database
      await this.saveAssistant(userId, assistant.id, assistant.name, assistant.instructions, assistant.model, vectorStore.id);
      await this.saveVectorStore(userId, vectorStore.id, vectorStore.name);

      // Update user with assistant info
      await query(`
        UPDATE users 
        SET openai_assistant_id = $1, vector_store_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [assistant.id, vectorStore.id, userId]);

      console.log(`✅ Agent setup complete for user ${username}`);
      
      return {
        assistant,
        vectorStore
      };
    } catch (error) {
      console.error(`❌ Error creating agent for user ${username}:`, error);
      throw error;
    }
  }

  // Get user's assistant
  async getUserAssistant(userId) {
    try {
      const result = await query(`
        SELECT openai_assistant_id, vector_store_id 
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0 || !result.rows[0].openai_assistant_id) {
        return null;
      }

      const user = result.rows[0];
      
      // Get assistant from OpenAI
      const assistant = await this.openai.beta.assistants.retrieve(user.openai_assistant_id);
      
      return {
        assistant,
        vectorStoreId: user.vector_store_id
      };
    } catch (error) {
      console.error('Error getting user assistant:', error);
      return null;
    }
  }

  // Update assistant
  async updateAssistant(assistantId, updates) {
    try {
      console.log('🔄 Updating OpenAI assistant:', assistantId);
      console.log('Update data:', updates);
      
      const assistant = await this.openai.beta.assistants.update(assistantId, updates);
      
      console.log('✅ Assistant updated in OpenAI successfully');
      return assistant;
    } catch (error) {
      console.error('❌ Error updating assistant in OpenAI:', error);
      throw error;
    }
  }

  // Delete assistant
  async deleteAssistant(assistantId) {
    try {
      // Delete from OpenAI
      await this.openai.beta.assistants.del(assistantId);
      
      // Delete from database
      await query(`
        DELETE FROM openai_assistants 
        WHERE assistant_id = $1
      `, [assistantId]);
      
      console.log(`✅ Assistant deleted: ${assistantId}`);
    } catch (error) {
      console.error('Error deleting assistant:', error);
      throw error;
    }
  }

  // Database helper methods
  async saveAssistant(userId, assistantId, assistantName, instructions, model, vectorStoreId) {
    try {
      await query(`
        INSERT INTO openai_assistants 
        (user_id, assistant_id, assistant_name, instructions, model, vector_store_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (assistant_id) 
        DO UPDATE SET 
          assistant_name = EXCLUDED.assistant_name,
          instructions = EXCLUDED.instructions,
          model = EXCLUDED.model,
          vector_store_id = EXCLUDED.vector_store_id,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, assistantId, assistantName, instructions, model, vectorStoreId]);
    } catch (error) {
      console.error('Error saving assistant to database:', error);
      throw error;
    }
  }

  async saveVectorStore(userId, storeId, storeName, description = "", fileCount = 0) {
    try {
      await query(`
        INSERT INTO vector_stores 
        (user_id, store_id, store_name, description, file_count)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (store_id) 
        DO UPDATE SET 
          store_name = EXCLUDED.store_name,
          description = EXCLUDED.description,
          file_count = EXCLUDED.file_count,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, storeId, storeName, description, fileCount]);
    } catch (error) {
      console.error('Error saving vector store to database:', error);
      throw error;
    }
  }

  // Get all assistants (both shared and user-specific)
  async getAllAssistants() {
    try {
      const result = await query(`
        SELECT 
          oa.*,
          CASE WHEN oa.user_id IS NULL THEN 'shared' ELSE 'user-specific' END as assistant_type,
          vs.store_name as vector_store_name,
          (SELECT COUNT(*) FROM users WHERE openai_assistant_id = oa.assistant_id) as user_count
        FROM openai_assistants oa
        LEFT JOIN vector_stores vs ON oa.vector_store_id = vs.store_id
        ORDER BY oa.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error getting all assistants:', error);
      throw error;
    }
  }

  // Get all vector stores from database
  async getAllVectorStores() {
    try {
      const result = await query(`
        SELECT vs.*, u.username 
        FROM vector_stores vs
        LEFT JOIN users u ON vs.user_id = u.id
        ORDER BY vs.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error getting all vector stores:', error);
      throw error;
    }
  }
}

module.exports = OpenAIAgentManager; 