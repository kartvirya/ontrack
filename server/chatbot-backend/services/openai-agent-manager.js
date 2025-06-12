const OpenAI = require('openai');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class OpenAIAgentManager {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.dbPath = path.join(__dirname, '..', 'database.sqlite');
    this.db = new sqlite3.Database(this.dbPath);
    
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

  // Create a new vector store for a user
  async createVectorStore(userId, userName) {
    try {
      console.log(`📚 Creating vector store for user ${userId}...`);
      
      const vectorStore = await this.openai.beta.vectorStores.create({
        name: `OnTrack-User-${userId}-${userName}`,
        expires_after: {
          anchor: "last_active_at",
          days: 365 // Store expires after 1 year of inactivity
        }
      });

      // Save to database
      await this.saveVectorStore(userId, vectorStore.id, vectorStore.name);
      
      console.log(`✅ Vector store created: ${vectorStore.id}`);
      return vectorStore;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  // Create a new assistant for a user
  async createAssistant(userId, userName, vectorStoreId = null) {
    try {
      console.log(`🤖 Creating assistant for user ${userId}...`);
      
      const instructions = this.defaultInstructions.replace('{USER_ID}', userId);
      
      const assistantConfig = {
        name: `OnTrack-Assistant-User-${userId}`,
        instructions: instructions,
        tools: [
          { type: "code_interpreter" },
          { type: "file_search" }
        ],
        model: "gpt-4-1106-preview"
      };

      // Add vector store if provided
      if (vectorStoreId) {
        assistantConfig.tool_resources = {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        };
      }

      const assistant = await this.openai.beta.assistants.create(assistantConfig);

      // Save to database
      await this.saveAssistant(userId, assistant.id, assistant.name, instructions, vectorStoreId);
      
      console.log(`✅ Assistant created: ${assistant.id}`);
      return assistant;
    } catch (error) {
      console.error('Error creating assistant:', error);
      throw error;
    }
  }

  // Provision complete agent setup for new user
  async provisionUserAgent(userId, userName) {
    try {
      console.log(`🚀 Provisioning complete agent setup for user ${userId}...`);
      
      // Create vector store first
      const vectorStore = await this.createVectorStore(userId, userName);
      
      // Create assistant with vector store
      const assistant = await this.createAssistant(userId, userName, vectorStore.id);
      
      // Update user record with agent IDs
      await this.updateUserAgentIds(userId, assistant.id, vectorStore.id);
      
      console.log(`✅ Agent provisioning complete for user ${userId}`);
      return {
        assistant: assistant,
        vectorStore: vectorStore
      };
    } catch (error) {
      console.error('Error provisioning user agent:', error);
      throw error;
    }
  }

  // Update instructions for all user assistants
  async updateAllAssistantInstructions(newInstructions) {
    try {
      console.log('🔄 Updating instructions for all assistants...');
      
      const assistants = await this.getAllAssistants();
      const updatePromises = [];
      
      for (const assistant of assistants) {
        const personalizedInstructions = newInstructions.replace('{USER_ID}', assistant.user_id);
        
        updatePromises.push(
          this.openai.beta.assistants.update(assistant.assistant_id, {
            instructions: personalizedInstructions
          }).then(() => {
            // Update database
            return this.updateAssistantInstructions(assistant.assistant_id, personalizedInstructions);
          })
        );
      }
      
      await Promise.all(updatePromises);
      console.log(`✅ Updated instructions for ${assistants.length} assistants`);
      
      return assistants.length;
    } catch (error) {
      console.error('Error updating assistant instructions:', error);
      throw error;
    }
  }

  // Delete user's assistant and vector store
  async deleteUserAgent(userId) {
    try {
      console.log(`🗑️ Deleting agent for user ${userId}...`);
      
      const user = await this.getUserAgentIds(userId);
      
      if (user.openai_assistant_id) {
        await this.openai.beta.assistants.del(user.openai_assistant_id);
        console.log(`✅ Deleted assistant: ${user.openai_assistant_id}`);
      }
      
      if (user.vector_store_id) {
        await this.openai.beta.vectorStores.del(user.vector_store_id);
        console.log(`✅ Deleted vector store: ${user.vector_store_id}`);
      }
      
      // Clean up database records
      await this.cleanupUserAgentRecords(userId);
      
      console.log(`✅ Agent cleanup complete for user ${userId}`);
    } catch (error) {
      console.error('Error deleting user agent:', error);
      throw error;
    }
  }

  // Database helper methods
  saveVectorStore(userId, storeId, storeName) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO vector_stores (user_id, store_id, store_name, description)
        VALUES (?, ?, ?, ?)
      `, [userId, storeId, storeName, `Vector store for user ${userId}`], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  saveAssistant(userId, assistantId, assistantName, instructions, vectorStoreId) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO openai_assistants (user_id, assistant_id, assistant_name, instructions, vector_store_id)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, assistantId, assistantName, instructions, vectorStoreId], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  updateUserAgentIds(userId, assistantId, vectorStoreId) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE users 
        SET openai_assistant_id = ?, vector_store_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [assistantId, vectorStoreId, userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  getAllAssistants() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM openai_assistants WHERE assistant_id IS NOT NULL
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getUserAgentIds(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT openai_assistant_id, vector_store_id FROM users WHERE id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }

  updateAssistantInstructions(assistantId, instructions) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE openai_assistants 
        SET instructions = ?, updated_at = CURRENT_TIMESTAMP
        WHERE assistant_id = ?
      `, [instructions, assistantId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  cleanupUserAgentRecords(userId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`DELETE FROM openai_assistants WHERE user_id = ?`, [userId]);
        this.db.run(`DELETE FROM vector_stores WHERE user_id = ?`, [userId]);
        this.db.run(`
          UPDATE users 
          SET openai_assistant_id = NULL, vector_store_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // Close database connection
  close() {
    this.db.close();
  }

  // Create a new assistant (standalone, not tied to a specific user)
  async createAssistant({ name, instructions, model = 'gpt-4-1106-preview', vectorStoreId }) {
    try {
      console.log(`🤖 Creating standalone assistant: ${name}...`);
      
      const assistantConfig = {
        name: name,
        instructions: instructions || this.defaultInstructions,
        tools: [
          { type: "code_interpreter" },
          { type: "file_search" }
        ],
        model: model
      };

      // Add vector store if provided
      if (vectorStoreId) {
        assistantConfig.tool_resources = {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        };
      }

      const assistant = await this.openai.beta.assistants.create(assistantConfig);
      
      console.log(`✅ Standalone assistant created: ${assistant.id}`);
      return assistant;
    } catch (error) {
      console.error('Error creating standalone assistant:', error);
      throw error;
    }
  }

  // Update an existing assistant
  async updateAssistant(assistantId, { name, instructions, model, vectorStoreId }) {
    try {
      console.log(`🔄 Updating assistant: ${assistantId}...`);
      
      const updateData = {};
      
      if (name) updateData.name = name;
      if (instructions) updateData.instructions = instructions;
      if (model) updateData.model = model;
      
      if (vectorStoreId !== undefined) {
        if (vectorStoreId) {
          updateData.tool_resources = {
            file_search: {
              vector_store_ids: [vectorStoreId]
            }
          };
        } else {
          updateData.tool_resources = {
            file_search: {
              vector_store_ids: []
            }
          };
        }
      }

      const assistant = await this.openai.beta.assistants.update(assistantId, updateData);
      
      console.log(`✅ Assistant updated: ${assistantId}`);
      return assistant;
    } catch (error) {
      console.error('Error updating assistant:', error);
      throw error;
    }
  }

  // Delete an assistant
  async deleteAssistant(assistantId) {
    try {
      console.log(`🗑️ Deleting assistant: ${assistantId}...`);
      
      await this.openai.beta.assistants.del(assistantId);
      
      console.log(`✅ Assistant deleted: ${assistantId}`);
    } catch (error) {
      console.error('Error deleting assistant:', error);
      throw error;
    }
  }

  // Create a new vector store (standalone)
  async createVectorStore({ name, description, files }) {
    try {
      console.log(`📚 Creating standalone vector store: ${name}...`);
      
      const vectorStore = await this.openai.beta.vectorStores.create({
        name: name,
        expires_after: {
          anchor: "last_active_at",
          days: 365 // Store expires after 1 year of inactivity
        }
      });

      // Upload files if provided
      if (files && files.length > 0) {
        console.log(`📁 Uploading ${files.length} files to vector store...`);
        
        const fileStreams = files.map(file => fs.createReadStream(file.path));
        
        await this.openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, {
          files: fileStreams
        });
        
        console.log(`✅ Files uploaded to vector store: ${vectorStore.id}`);
      }
      
      console.log(`✅ Vector store created: ${vectorStore.id}`);
      return vectorStore;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  // Delete a vector store
  async deleteVectorStore(vectorStoreId) {
    try {
      console.log(`🗑️ Deleting vector store: ${vectorStoreId}...`);
      
      await this.openai.beta.vectorStores.del(vectorStoreId);
      
      console.log(`✅ Vector store deleted: ${vectorStoreId}`);
    } catch (error) {
      console.error('Error deleting vector store:', error);
      throw error;
    }
  }
}

module.exports = OpenAIAgentManager; 