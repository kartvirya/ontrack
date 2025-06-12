const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function createAssistant() {
  try {
    console.log('🤖 Creating OnTrack Train Assistant...');
    
    const assistant = await openai.beta.assistants.create({
      name: "OnTrack Train Assistant",
      instructions: `You are Lisa, an expert AI assistant for train maintenance and technical support. You specialize in:

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

Be helpful, professional, and safety-conscious in all responses. When showing images or schematics, provide context about what the user is viewing and any relevant technical details.`,
      tools: [{ type: "code_interpreter" }],
      model: "gpt-4-1106-preview"
    });

    console.log('✅ Assistant created successfully!');
    console.log('📋 Assistant Details:');
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Name: ${assistant.name}`);
    console.log(`   Model: ${assistant.model}`);
    
    // Update the .env file with the new Assistant ID
    const fs = require('fs');
    const envContent = fs.readFileSync('.env', 'utf8');
    const updatedEnv = envContent.replace(
      'ASSISTANT_ID=your_assistant_id_here',
      `ASSISTANT_ID=${assistant.id}`
    );
    fs.writeFileSync('.env', updatedEnv);
    
    console.log('✅ Updated .env file with Assistant ID');
    console.log('🚀 Your app is now ready to run!');
    console.log('\nTo start the application, run:');
    console.log('   cd ../..');
    console.log('   ./start-app.sh');
    
  } catch (error) {
    console.error('❌ Error creating assistant:', error.message);
    if (error.code === 'invalid_api_key') {
      console.error('Please check your OpenAI API key in the .env file');
    }
  }
}

createAssistant(); 