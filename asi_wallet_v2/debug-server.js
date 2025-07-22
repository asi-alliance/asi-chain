const { spawn } = require('child_process');

console.log('Starting React development server with debugging...');

const server = spawn('npm', ['start'], {
  env: { ...process.env, PORT: '3001' },
  stdio: 'pipe'
});

server.stdout.on('data', (data) => {
  process.stdout.write(data);
});

server.stderr.on('data', (data) => {
  console.error('[ERROR]:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  server.kill();
  process.exit();
});