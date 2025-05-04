
const fs = require('fs');
const path = require('path');

// Version info file path
const VERSION_INFO_FILE = path.join(__dirname, 'version-info.json');

// Initialize version info
function initializeVersions() {
  // Check if version info file already exists
  if (fs.existsSync(VERSION_INFO_FILE)) {
    console.log('Version info file already exists. To reset, delete version-info.json first.');
    return;
  }
  
  // Create default version info
  const versionInfo = {
    development: {
      version: '0.1.0',
      features: [],
      lastUpdate: new Date().toISOString()
    },
    staging: {
      version: '0.0.0',
      features: [],
      lastUpdate: new Date().toISOString()
    },
    production: {
      version: '0.0.0',
      features: [],
      lastUpdate: new Date().toISOString()
    },
    checkpoints: []
  };
  
  // Write version info to file
  fs.writeFileSync(VERSION_INFO_FILE, JSON.stringify(versionInfo, null, 2));
  
  console.log('Initialized version info:');
  console.log(`- Development: ${versionInfo.development.version}`);
  console.log(`- Staging: ${versionInfo.staging.version}`);
  console.log(`- Production: ${versionInfo.production.version}`);
  console.log('\nUse "node version-manager.js status" to check version status');
}

// Run the function
initializeVersions();
