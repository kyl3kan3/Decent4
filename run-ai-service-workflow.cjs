/**
 * AI Service Workflow Script
 * 
 * This script runs the AI optimization service in a dedicated workflow.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const colors = require('colors');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function updateWorkflow() {
  try {
    log('Adding AI Service workflow configuration...');
    
    // Write the workflow configuration
    const workflowConfigPath = '.replit.workflow.json';
    let workflowConfig = {};
    
    // Read existing config if it exists
    if (fs.existsSync(workflowConfigPath)) {
      const configContent = fs.readFileSync(workflowConfigPath, 'utf8');
      try {
        workflowConfig = JSON.parse(configContent);
      } catch (err) {
        log('Error parsing existing workflow config, creating new one');
        workflowConfig = {};
      }
    }
    
    // Add or update AI Service workflow
    workflowConfig['AI Service'] = {
      env: {},
      icon: "memory",
      restartable: true,
      restartOnFileChange: ["test-ai-service.cjs"],
      startCommand: ["node", "test-ai-service.cjs"],
      terminateCommand: ["kill-port", "5200"]
    };
    
    // Write updated config
    fs.writeFileSync(workflowConfigPath, JSON.stringify(workflowConfig, null, 2));
    log('AI Service workflow configuration added successfully!');
    
    return true;
  } catch (error) {
    log(`Failed to update workflow: ${error.message}`);
    return false;
  }
}

// Run the update function
updateWorkflow().then(success => {
  if (success) {
    log('Workflow update completed successfully!');
    log('You can now run the AI Service workflow from the Replit workflows panel.');
    
    // Run the workflow automatically
    try {
      require('child_process').execSync('npm run ai-service', { stdio: 'inherit' });
    } catch (error) {
      // Handle error if any
      log(`Error running workflow: ${error.message}`);
    }
  } else {
    log('Workflow update failed.');
  }
});