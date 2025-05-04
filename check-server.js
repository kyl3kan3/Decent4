import fetch from 'node-fetch';

async function checkServer() {
  try {
    console.log('Checking if server is running on port 3001...');
    const response = await fetch('http://localhost:3001/api/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('Server is running! Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error(`Server returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Error connecting to server:', error.message);
    return false;
  }
}

// Execute the check
checkServer().then(isRunning => {
  if (!isRunning) {
    console.log('Server does not appear to be running properly.');
    console.log('Check server.log for any error messages or try restarting with ./start-server.sh');
  }
});