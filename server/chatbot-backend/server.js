const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import database query function
const { query } = require('./config/database');

// Import authentication middleware and routes
const { authenticateToken, requireActiveUser, logActivity, verifyUser } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');

const app = express();

// Enable CORS with more specific options
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication and admin routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await query('SELECT 1 as test');
    
    // Check if critical tables exist
    const tableChecks = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'conversations', 'user_activity', 'user_settings', 'notifications')
      ORDER BY table_name
    `);
    
    const tables = tableChecks.rows.map(row => row.table_name);
    const missingTables = ['users', 'conversations', 'user_activity', 'user_settings', 'notifications']
      .filter(table => !tables.includes(table));
    
    res.json({ 
      status: missingTables.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        tables: tables,
        missingTables: missingTables,
        totalTables: tables.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Debug endpoint to log incoming requests
app.use('/api/*', (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.originalUrl} from ${req.get('origin') || 'unknown origin'}`);
  next();
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({ 
      status: 'Database connected', 
      timestamp: new Date().toISOString(),
      database: {
        current_time: result.rows[0].current_time,
        postgres_version: result.rows[0].postgres_version
      }
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'Database connection failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Temporary endpoint to check database schema
app.get('/api/db-schema', async (req, res) => {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    res.json({ 
      status: 'Schema retrieved', 
      tables: tables,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Schema check failed:', error);
    res.status(500).json({ 
      status: 'Schema check failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Temporary endpoint to check conversations table structure
app.get('/api/db-conversations', async (req, res) => {
  try {
    // Get conversations table structure
    const conversationsStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // Get conversation_messages table structure
    const messagesStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'conversation_messages' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // Get sample conversation data
    const sampleConversations = await query(`
      SELECT id, user_id, thread_id, title, message_count, created_at, updated_at
      FROM conversations 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    res.json({ 
      status: 'Conversations table info retrieved', 
      conversationsStructure: conversationsStructure.rows,
      messagesStructure: messagesStructure.rows,
      sampleData: sampleConversations.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Conversations table check failed:', error);
    res.status(500).json({ 
      status: 'Conversations table check failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Temporary endpoint to check users table structure
app.get('/api/db-users', async (req, res) => {
  try {
    // Get table structure
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // Get existing users (without passwords)
    const users = await query(`
      SELECT id, username, email, role, status, created_at, last_login
      FROM users 
      ORDER BY id
    `);
    
    res.json({ 
      status: 'Users table info retrieved', 
      structure: structure.rows,
      users: users.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Users table check failed:', error);
    res.status(500).json({ 
      status: 'Users table check failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Enhanced OpenAI client setup with better error handling
const setupOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY in environment variables');
    throw new Error('OpenAI API key is required');
  }
  
  const assistantId = process.env.ASSISTANT_ID;
  
  if (!assistantId) {
    console.error('Missing ASSISTANT_ID in environment variables');
    throw new Error('Assistant ID is required');
  }
  
  console.log(`Setting up OpenAI client with Assistant ID: ${assistantId.substring(0, 5)}...`);
  
  return new OpenAI({
    apiKey: apiKey,
    timeout: 60000, // 60 second timeout
    maxRetries: 3
  });
};

// Set up OpenAI client with enhanced error checking
const openai = setupOpenAI();

// Define a mapping for user-friendly terms to actual filenames
const trainPartMappings = {
  // Map common terms to the specific filenames
  'alerter': 'SD60M ALERTER Q2518.jpg',
  'distributed power': 'SD60M DISTRIBUTED POWER LSI RACK.jpg',
  'computer screen': 'SD60M HVC 60 SERIES COMPUTER SCREEN.jpg',
  'circuit breaker panel': 'SD60M HVC CIRCUIT BREAKER PANEL.jpg',
  'isolation panel behind': 'SD60M HVC ISOLATION PANEL BEHIND.jpg',
  'isolation panel inside': 'SD60M HVC ISOLATION PANEL INSIDE.jpg',
  'relay panel right wall': 'SD60M HVC RELAY PANEL RIGHT WALL.jpg',
  'relay panel right': 'SD60M HVC RELAY PANEL RIGHT.jpg',
  'relay panel upper middle': 'SD60M HVC RELAY PANEL UPPER MIDDLE.jpg',
  'relay panel upper right': 'SD60M HVC RELAY PANEL UPPER RIGHT.jpg',
  'relay panel': 'SD60M HVC RELAY PANEL.jpg',
  'smartstart': 'SD60M HVC SMARTSTART 2E.jpg',
  'event recorder': 'SD60M QUANTUM EVENT RECORDER.jpg',
  'remote card download': 'SD60M QUANTUM REMOTE CARD DOWNLOAD.jpg',
  'resistors': 'SD60M RESISTORS & DIODES LSI RACK.jpg',
  'sub-base fast break': 'SD60M SUB-BASE FAST BREAK REAR.jpg',
  'tb30s board': 'SD60M TB30S BOARD PANEL STYLE.jpg',
  'terminal board': 'SD60M TERMINAL BOARD 30S X STYLE.jpg',
  'dc-dc converter': 'SD60M WILMORE DC-DC CONVERTER.jpg'
};

// Define a mapping for SD-60 schematic pages
const schematicMappings = {
  '13': 'WD03463 SD-60 PAGE 13.png',
  '14': 'WD03463 SD-60 PAGE 14.png',
  '15': 'WD03463 SD-60 PAGE 15.png',
  '16': 'WD03463 SD-60 PAGE 16.png',
  '17': 'WD03463 SD-60 PAGE 17.png',
  '18': 'WD03463 SD-60 PAGE 18.png',
  '19': 'WD03463 SD-60 PAGE 19.png',
  '20': 'WD03463 SD-60 PAGE 20.png',
  '21': 'WD03463 SD-60 PAGE 21.png',
  '22': 'WD03463 SD-60 PAGE 22.png',
  '23': 'WD03463 SD-60 PAGE 23.png',
  '24': 'WD03463 SD-60 PAGE 24.png',
  '25': 'WD03463 SD-60 PAGE 25.png',
  '26': 'WD03463 SD-60 PAGE 26.png',
  '27': 'WD03463 SD-60 PAGE 27.png',
  '28': 'WD03463 SD-60 PAGE 28.png',
  '29': 'WD03463 SD-60 PAGE 29.png',
  '30': 'WD03463 SD-60 PAGE 30.png',
  '31': 'WD03463 SD-60 PAGE 31.png',
  '32': 'WD03463 SD-60 PAGE 32.png',
  '33': 'WD03463 SD-60 PAGE 33.png',
  '34': 'WD03463 SD-60 PAGE 34.png',
  '35': 'WD03463 SD-60 PAGE 35.png',
  '36': 'WD03463 SD-60 PAGE 36.png',
  '37': 'WD03463 SD-60 PAGE 37.png',
  '38': 'WD03463 SD-60 PAGE 38.png',
  '39': 'WD03463 SD-60 PAGE 39.png',
  '40': 'WD03463 SD-60 PAGE 40.png',
  '41': 'WD03463 SD-60 PAGE 41.png',
  '42': 'WD03463 SD-60 PAGE 42.png',
  '43': 'WD03463 SD-60 PAGE 43.png',
  '44': 'WD03463 SD-60 PAGE 44.png',
  '45': 'WD03463 SD-60 PAGE 45.png',
  '46': 'WD03463 SD-60 PAGE 46.png',
  '47': 'WD03463 SD-60 PAGE 47.png',
  '48': 'WD03463 SD-60 PAGE 48.png',
  '50': 'WD03463 SD-60 PAGE 50.png',
  '51': 'WD03463 SD-60 PAGE 51.png',
  '53': 'WD03463 SD-60 PAGE 53.png',
  '56': 'WD03463 SD-60 PAGE 56.png',
  '57': 'WD03463 SD-60 PAGE 57.png',
  '58': 'WD03463 SD-60 PAGE 58.png',
  '59': 'WD03463 SD-60 PAGE 59.png',
  '60': 'WD03463 SD-60 PAGE 60.png',
  '62': 'WD03463 SD-60 PAGE 62.png'
};

// Define a mapping for IETMS schematic pages
const ietmsMappings = {
  '2': '24-2-19294 PTC IETMS PAGE 2.png',
  '3': '24-2-19294 PTC IETMS PAGE 3.png',
  '4': '24-2-19294 PTC IETMS PAGE 4.png',
  '5': '24-2-19294 PTC IETMS PAGE 5.png',
  '6': '24-2-19294 PTC IETMS PAGE 6.png',
  '7': '24-2-19294 PTC IETMS PAGE 7.png',
  '8': '24-2-19294 PTC IETMS PAGE 8.png',
  '9': '24-2-19294 PTC IETMS PAGE 9.png',
  '10': '24-2-19294 PTC IETMS PAGE 10.png'
};

// Load metadata for train parts
let trainPartMetadata = {};
try {
  // Path to metadata file
  const metadataPath = path.join(__dirname, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    trainPartMetadata = JSON.parse(metadataContent);
  } else {
    console.warn('Metadata file not found, using default descriptions');
  }
} catch (error) {
  console.error('Error loading metadata file:', error);
}

// Function to identify train part from user message
function identifyTrainPart(message) {
  const lowercaseMessage = message.toLowerCase();
  
  // Check if the message is a request to show an image
  const imageRequestPhrases = [
    'show me an image of',
    'show me a picture of',
    'show me the',
    'can i see the',
    'display the',
    'show a photo of',
    'let me see the'
  ];
  
  let isImageRequest = false;
  for (const phrase of imageRequestPhrases) {
    if (lowercaseMessage.includes(phrase)) {
      isImageRequest = true;
      break;
    }
  }
  
  if (!isImageRequest) {
    return null;
  }
  
  // Check for train parts in the message
  for (const [partKey, filename] of Object.entries(trainPartMappings)) {
    if (lowercaseMessage.includes(partKey.toLowerCase())) {
      // Get metadata if available
      const metadata = trainPartMetadata[partKey] || {
        displayName: partKey.charAt(0).toUpperCase() + partKey.slice(1),
        description: `SD60M ${partKey.charAt(0).toUpperCase() + partKey.slice(1)}`
      };
      
      return {
        partName: partKey,
        filename: filename,
        displayName: metadata.displayName,
        description: metadata.description,
        type: 'trainPart'
      };
    }
  }
  
  // Check for partial matches in filenames (fallback)
  for (const [partKey, filename] of Object.entries(trainPartMappings)) {
    const filenameLower = filename.toLowerCase();
    // Extract words from the message that might be part of a filename
    const words = lowercaseMessage.split(' ');
    
    for (const word of words) {
      if (word.length > 3 && filenameLower.includes(word)) {
        // Get metadata if available
        const metadata = trainPartMetadata[partKey] || {
          displayName: partKey.charAt(0).toUpperCase() + partKey.slice(1),
          description: `SD60M ${partKey.charAt(0).toUpperCase() + partKey.slice(1)}`
        };
        
        return {
          partName: partKey,
          filename: filename,
          displayName: metadata.displayName,
          description: metadata.description,
          type: 'trainPart'
        };
      }
    }
  }
  
  return null;
}

// Function to identify schematic page from user message
function identifySchematic(message) {
  const lowercaseMessage = message.toLowerCase();
  
  // Check if the message is a request to show a schematic
  const schematicRequestPhrases = [
    'show me a schematic',
    'show me the schematic',
    'show schematic',
    'can i see schematic',
    'display schematic',
    'show me diagram',
    'schematic page',
    'page',
    'sd-60 page',
    'sd60 page'
  ];
  
  // Don't check for schematic requests if it's specifically asking for IETMS
  if (lowercaseMessage.includes('ietms') || lowercaseMessage.includes('ptc')) {
    return null;
  }
  
  let isSchematicRequest = false;
  for (const phrase of schematicRequestPhrases) {
    if (lowercaseMessage.includes(phrase)) {
      isSchematicRequest = true;
      break;
    }
  }
  
  if (!isSchematicRequest) {
    return null;
  }
  
  // Look for page numbers in the message
  const pageRegex = /page\s+(\d+)/i;
  const pageMatch = message.match(pageRegex);
  
  if (pageMatch && pageMatch[1]) {
    const pageNumber = pageMatch[1];
    
    // Check if we have this page in our mapping
    if (schematicMappings[pageNumber]) {
      return {
        pageNumber: pageNumber,
        filename: schematicMappings[pageNumber],
        displayName: `SD-60 Schematic Page ${pageNumber}`,
        description: `Electrical schematic diagram for the SD-60, page ${pageNumber}`,
        type: 'schematic'
      };
    }
  }
  
  // Alternative regex to find just numbers that might be page references
  const numRegex = /\b(\d+)\b/g;
  const numbers = [...message.matchAll(numRegex)];
  
  for (const match of numbers) {
    const pageNumber = match[1];
    if (schematicMappings[pageNumber]) {
      return {
        pageNumber: pageNumber,
        filename: schematicMappings[pageNumber],
        displayName: `SD-60 Schematic Page ${pageNumber}`,
        description: `Electrical schematic diagram for the SD-60, page ${pageNumber}`,
        type: 'schematic'
      };
    }
  }
  
  return null;
}

// Function to identify IETMS schematic page from user message
function identifyIETMSSchematic(message) {
  const lowercaseMessage = message.toLowerCase();
  
  // Check if the message is a request to show an IETMS schematic
  const ietmsRequestPhrases = [
    'show me a schematic of ietms',
    'show me the schematic of ietms',
    'show me the ietms schematic',
    'show ietms schematic',
    'can i see ietms schematic',
    'display ietms schematic',
    'show me ietms diagram',
    'ietms page',
    'ptc ietms',
    'ptc page',
    'show me the schematic of ptc'
  ];
  
  let isIETMSRequest = false;
  for (const phrase of ietmsRequestPhrases) {
    if (lowercaseMessage.includes(phrase) || 
        (lowercaseMessage.includes('schematic') && 
         (lowercaseMessage.includes('ietms') || lowercaseMessage.includes('ptc')))) {
      isIETMSRequest = true;
      break;
    }
  }
  
  if (!isIETMSRequest) {
    return null;
  }
  
  // Look for page numbers in the message
  const pageRegex = /page\s+(\d+)/i;
  const pageMatch = message.match(pageRegex);
  
  if (pageMatch && pageMatch[1]) {
    const pageNumber = pageMatch[1];
    
    // Check if we have this page in our mapping
    if (ietmsMappings[pageNumber]) {
      return {
        pageNumber: pageNumber,
        filename: ietmsMappings[pageNumber],
        displayName: `PTC IETMS Schematic Page ${pageNumber}`,
        description: `PTC IETMS schematic diagram, page ${pageNumber}`,
        type: 'ietms'
      };
    }
  }
  
  // Alternative regex to find just numbers that might be page references
  const numRegex = /\b(\d+)\b/g;
  const numbers = [...message.matchAll(numRegex)];
  
  for (const match of numbers) {
    const pageNumber = match[1];
    if (ietmsMappings[pageNumber]) {
      return {
        pageNumber: pageNumber,
        filename: ietmsMappings[pageNumber],
        displayName: `PTC IETMS Schematic Page ${pageNumber}`,
        description: `PTC IETMS schematic diagram, page ${pageNumber}`,
        type: 'ietms'
      };
    }
  }
  
  // If no specific page is requested, default to page 2 (first page)
  if (ietmsMappings['2']) {
    return {
      pageNumber: '2',
      filename: ietmsMappings['2'],
      displayName: `PTC IETMS Schematic Page 2`,
      description: `PTC IETMS schematic diagram, page 2 (first page)`,
      type: 'ietms'
    };
  }
  
  return null;
}

// Setup image directories
const IMAGES_DIR = path.join(__dirname, 'Train-Images');
const SCHEMATICS_DIR = path.join(__dirname, 'Train-Schematics');
const IETMS_DIR = path.join(__dirname, 'IETMS-Schematics');

// Create directories if they don't exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

if (!fs.existsSync(SCHEMATICS_DIR)) {
  fs.mkdirSync(SCHEMATICS_DIR, { recursive: true });
}

if (!fs.existsSync(IETMS_DIR)) {
  fs.mkdirSync(IETMS_DIR, { recursive: true });
}

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running' });
});

// API endpoint to get train metadata
app.get('/api/train/metadata', async (req, res) => {
  try {
    res.json(trainPartMetadata);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error fetching train metadata' });
  }
});

// Endpoint to serve train images directly from the filesystem
app.get('/api/train/image/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const imagePath = path.join(IMAGES_DIR, filename);
    
    console.log(`Attempting to serve image: ${imagePath}`);
    
    // Check if file exists
    if (fs.existsSync(imagePath)) {
      // Set appropriate headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'image/jpeg');
      return res.sendFile(imagePath);
    } else {
      console.error(`Image not found: ${imagePath}`);
      return res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Endpoint to serve schematic images
app.get('/api/schematic/image/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const imagePath = path.join(SCHEMATICS_DIR, filename);
    
    console.log(`Attempting to serve schematic: ${imagePath}`);
    
    // Check if file exists
    if (fs.existsSync(imagePath)) {
      // Set appropriate headers for PNG with transparency
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'image/png');
      // Disable caching to ensure fresh images are served
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(imagePath);
    } else {
      console.error(`Schematic not found: ${imagePath}`);
      return res.status(404).json({ error: 'Schematic not found' });
    }
  } catch (error) {
    console.error('Error serving schematic:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Endpoint to serve IETMS schematic images
app.get('/api/ietms/image/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const imagePath = path.join(IETMS_DIR, filename);
    
    console.log(`Attempting to serve IETMS schematic: ${imagePath}`);
    
    // Check if file exists
    if (fs.existsSync(imagePath)) {
      // Set appropriate headers for PNG with transparency
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'image/png');
      // Disable caching to ensure fresh images are served
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(imagePath);
    } else {
      console.error(`IETMS schematic not found: ${imagePath}`);
      return res.status(404).json({ error: 'IETMS schematic not found' });
    }
  } catch (error) {
    console.error('Error serving IETMS schematic:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Enhanced chat API that checks for train part, schematic, and IETMS requests
// Now supports both authenticated users (with personal assistants) and anonymous users
app.post('/api/chat', logActivity('chat_message'), async (req, res) => {
  try {
    const { message, threadId } = req.body;
    let userAssistantId = process.env.ASSISTANT_ID; // Default assistant
    let userId = null;
    
    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('./middleware/auth');
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user is active and get their assistant ID
        const user = await verifyUser(decoded.id);
        if (user && user.openai_assistant_id) {
          userAssistantId = user.openai_assistant_id;
          userId = user.id;
          console.log(`Using personal assistant ${userAssistantId} for user ${user.username}`);
        }
      } catch (authError) {
        console.log('Authentication failed, using default assistant:', authError.message);
        // Continue with default assistant for anonymous users
      }
    }
    
    // First check if the message is asking about a train part
    const trainPartRequest = identifyTrainPart(message);
    
    if (trainPartRequest) {
      // Handle train part request directly
      // Use absolute URL with backend domain for the image
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      const imageUrl = `${backendUrl}/api/train/image/${encodeURIComponent(trainPartRequest.filename)}`;
      
      console.log(`Train part identified: ${trainPartRequest.partName}, Image URL: ${imageUrl}`);
      
      // Prepare response with description removed
      const response = {
        message: `Here's the ${trainPartRequest.displayName}`, // Remove description
        threadId: threadId || 'local',
        isTrainPart: true,
        trainPart: {
          name: trainPartRequest.partName,
          displayName: trainPartRequest.displayName,
          filename: trainPartRequest.filename,
          imageUrl: imageUrl,
          // Still including description in the data, but not displaying it
          description: '' 
        }
      };
      
      return res.json(response);
    }
    
    // Then check if the message is asking about an IETMS schematic
    // We check IETMS before regular schematics because it's more specific
    const ietmsRequest = identifyIETMSSchematic(message);
    
    if (ietmsRequest) {
      // Handle IETMS schematic request directly
      // Use absolute URL with backend domain for the image
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      const imageUrl = `${backendUrl}/api/ietms/image/${encodeURIComponent(ietmsRequest.filename)}`;
      
      console.log(`IETMS schematic identified: ${ietmsRequest.pageNumber}, Image URL: ${imageUrl}`);
      
      // Prepare response
      const response = {
        message: `Here's the ${ietmsRequest.displayName}`,
        threadId: threadId || 'local',
        isTrainPart: true, // Reuse the same frontend handling
        trainPart: {
          name: `ietms_page_${ietmsRequest.pageNumber}`,
          displayName: ietmsRequest.displayName,
          filename: ietmsRequest.filename,
          imageUrl: imageUrl,
          description: ietmsRequest.description
        }
      };
      
      return res.json(response);
    }
    
    // Then check if the message is asking about a regular schematic
    const schematicRequest = identifySchematic(message);
    
    if (schematicRequest) {
      // Handle schematic request directly
      // Use absolute URL with backend domain for the image
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      const imageUrl = `${backendUrl}/api/schematic/image/${encodeURIComponent(schematicRequest.filename)}`;
      
      console.log(`Schematic identified: ${schematicRequest.pageNumber}, Image URL: ${imageUrl}`);
      
      // Prepare response
      const response = {
        message: `Here's the ${schematicRequest.displayName}`,
        threadId: threadId || 'local',
        isTrainPart: true, // Reuse the same frontend handling
        trainPart: {
          name: `schematic_page_${schematicRequest.pageNumber}`,
          displayName: schematicRequest.displayName,
          filename: schematicRequest.filename,
          imageUrl: imageUrl,
          description: schematicRequest.description
        }
      };
      
      return res.json(response);
    }
    
    // If not a train part, IETMS, or schematic request, proceed with OpenAI
    let thread;
    
    // Create or retrieve thread
    if (!threadId) {
      thread = await openai.beta.threads.create();
    } else {
      thread = { id: threadId };
    }
    
    // Add message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    
    // Run assistant with improved error handling
    try {
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: userAssistantId // Use user's personal assistant or default
      });
      
      // Wait for completion with timeout and error handling
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (runStatus.status !== 'completed' && attempts < maxAttempts) {
        // Add more detailed logging
        console.log(`Run status: ${runStatus.status}, attempt ${attempts + 1}/${maxAttempts}`);
        
        if (runStatus.status === 'failed') {
          console.error('Run failed with error:', runStatus.last_error);
          throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
        }
        
        if (runStatus.status === 'expired') {
          throw new Error('Assistant run expired: took too long to complete');
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        // Refresh status
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out after 30 seconds');
      }
      
      // Get messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      
      if (messages.data.length === 0) {
        throw new Error('No response received from assistant');
      }
      
      const lastMessage = messages.data[0];
      
      res.json({
        message: lastMessage.content[0].text.value,
        threadId: thread.id,
        isTrainPart: false,
        assistantType: userId ? 'personal' : 'default'
      });
    } catch (error) {
      console.error('OpenAI Assistant Error:', error);
      
      // Create a fallback response
      res.json({
        message: "I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or try asking a different question.",
        threadId: thread.id,
        isTrainPart: false,
        assistantType: userId ? 'personal' : 'default'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error processing request: ' + error.message });
  }
});

// Temporary endpoint to create admin user
app.post('/api/create-admin', async (req, res) => {
  try {
    const { generateToken } = require('./middleware/auth');
    
    const adminUsername = 'admin';
    const adminEmail = 'admin@lisa.com';
    const adminPassword = 'admin123456';
    
    // Check if admin already exists
    const existingAdmin = await query(`
      SELECT id FROM users WHERE username = $1 OR email = $2
    `, [adminUsername, adminEmail]);
    
    if (existingAdmin.rows.length > 0) {
      return res.json({ 
        message: 'Admin user already exists',
        credentials: {
          username: adminUsername,
          email: adminEmail,
          password: adminPassword
        }
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create admin user
    const result = await query(`
      INSERT INTO users (username, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, status, created_at
    `, [adminUsername, adminEmail, hashedPassword, 'admin', 'active']);
    
    const adminUser = result.rows[0];
    const token = generateToken(adminUser);
    
    res.json({
      message: 'Admin user created successfully',
      user: adminUser,
      token: token,
      credentials: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword
      }
    });
    
  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create admin user',
      details: error.message
    });
  }
});

// Test conversation save endpoint to debug production issues
app.post('/api/test-conversation-save', async (req, res) => {
  try {
    console.log('🧪 Testing conversation save in production...');
    
    // Test simple database operations
    const testUser = await query('SELECT id FROM users LIMIT 1');
    if (testUser.rows.length === 0) {
      return res.status(400).json({ error: 'No users found for testing' });
    }
    
    const userId = testUser.rows[0].id;
    const testThreadId = 'test-' + Date.now();
    const testTitle = 'Test Conversation';
    const testMessages = [
      { role: 'user', content: 'Hello, this is a test message' },
      { role: 'assistant', content: 'Hello! This is a test response.' }
    ];
    
    console.log('Testing with userId:', userId, 'threadId:', testThreadId);
    
    // Try to create a conversation
    const conversationResult = await query(`
      INSERT INTO conversations (user_id, thread_id, title, message_count, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [userId, testThreadId, testTitle, testMessages.length]);
    
    const conversationId = conversationResult.rows[0].id;
    console.log('Created conversation with ID:', conversationId);
    
    // Try to insert messages
    for (const message of testMessages) {
      await query(`
        INSERT INTO conversation_messages 
        (conversation_id, role, content, assistant_type, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [
        conversationId,
        message.role,
        message.content,
        null
      ]);
    }
    
    console.log('✅ Test conversation save completed successfully');
    
    // Clean up test data
    await query('DELETE FROM conversation_messages WHERE conversation_id = $1', [conversationId]);
    await query('DELETE FROM conversations WHERE id = $1', [conversationId]);
    
    res.json({
      message: 'Test conversation save successful',
      testData: {
        userId,
        testThreadId,
        conversationId,
        messagesCount: testMessages.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test conversation save failed:', error);
    res.status(500).json({ 
      error: 'Test conversation save failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Manual production database fix endpoint
app.post('/api/fix-production-database', async (req, res) => {
  try {
    console.log('🔧 Manual production database fix triggered...');
    const fixes = [];
    
    // Check if user_activity table exists
    const userActivityCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_activity'
    `);
    
    if (userActivityCheck.rows.length === 0) {
      console.log('❌ user_activity table missing - creating now...');
      
      // Create user_activity table
      await query(`
        CREATE TABLE user_activity (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(100) NOT NULL,
          details TEXT,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      fixes.push('✅ user_activity table created');
      
      // Create index for performance
      await query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id)
      `);
      fixes.push('✅ Index created on user_activity.user_id');
    } else {
      fixes.push('✅ user_activity table already exists');
    }
    
    // Create user_settings table
    await query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'light',
        chat_sound_enabled BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        auto_save_conversations BOOLEAN DEFAULT true,
        conversation_retention_days INTEGER DEFAULT 365,
        default_assistant_model VARCHAR(50) DEFAULT 'gpt-4-1106-preview',
        sidebar_collapsed BOOLEAN DEFAULT false,
        show_timestamps BOOLEAN DEFAULT true,
        compact_mode BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    fixes.push('✅ user_settings table verified');
    
    // Create notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        read_status BOOLEAN DEFAULT false,
        action_url VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    fixes.push('✅ notifications table verified');
    
    // Create necessary indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status)`);
    fixes.push('✅ All indexes created');
    
    // Check final table count
    const tableCount = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('✅ Production database fix completed successfully!');
    
    res.json({
      message: 'Production database fixed successfully',
      fixes: fixes,
      totalTables: tableCount.rows[0].count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Production database fix failed:', error);
    res.status(500).json({ 
      error: 'Failed to fix production database',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Temporary endpoint to test OpenAI API key
app.get('/api/test-openai', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'No OpenAI API key found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test the API key by listing models
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({
        error: 'OpenAI API key test failed',
        status: response.status,
        details: errorData,
        keyPrefix: apiKey.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });
    }
    
    const data = await response.json();
    
    res.json({
      status: 'OpenAI API key is valid',
      modelCount: data.data ? data.data.length : 0,
      keyPrefix: apiKey.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('OpenAI test error:', error);
    res.status(500).json({ 
      error: 'OpenAI API test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auto-fix production database on startup
async function initializeProductionDatabase() {
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
    try {
      console.log('🔧 Checking production database...');
      const { fixProductionDatabase } = require('./scripts/fix-production-db');
      await fixProductionDatabase();
      console.log('✅ Production database verified/fixed');
    } catch (error) {
      console.error('⚠️ Production database fix failed:', error.message);
      // Don't fail server startup, just log the error
    }
  }
}

const PORT = process.env.PORT || 3001;

// Initialize database before starting server
(async () => {
  await initializeProductionDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
