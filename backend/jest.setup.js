import { TextEncoder, TextDecoder } from 'util';

// Add global browser-like APIs for Node.js testing
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Increase timeout for async tests
// jest.setTimeout(10000);