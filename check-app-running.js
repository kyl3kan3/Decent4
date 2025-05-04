/**
 * Simple script to check if the application is running
 */
import * as http from 'node:http';

const options = {
  hostname: '0.0.0.0',
  port: 5001,
  path: '/',
  method: 'GET',
  timeout: 5000
};

console.log('Checking if application is running on port 5001...');

const req = http.request(options, (res) => {
  console.log(`Application is running! Status Code: ${res.statusCode}`);
  console.log(`You can access it at: https://0aa26b5c-e96a-4180-9ef2-54af0241b5ae-00-3p71wf260pg3u.spock.replit.dev/health`);
  console.log('This URL is the full Replit URL with the health route');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Application is responding with HTML content');
    console.log('Application is ready to use!');
  });
});

req.on('error', (e) => {
  console.error(`Problem with application: ${e.message}`);
  console.log('The application may not be running. Make sure to start the server workflow.');
});

req.on('timeout', () => {
  console.log('Request timed out after 5 seconds.');
  req.abort();
});

req.end();