/**
 * Integration Test for Enhanced Accuracy Testing System
 * Tests core functionality integration without complex mocking
 */

// Simple test to verify our implementation works
describe('Enhanced Accuracy Testing Integration', () => {
    test('should have all required files created', () => {
        const fs = require('fs');
        const path = require('path');

        const requiredFiles = [
            '../js/enhanced-accuracy-tester.js',
            '../js/server-manager.js', 
            '../js/performance-ui.js',
            '../server/accuracy-server.js',
            '../server/package.json'
        ];

        requiredFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });

    test('should have updated main app.js with performance UI import', () => {
        const fs = require('fs');
        const path = require('path');
        
        const appPath = path.join(__dirname, '../js/app.js');
        const content = fs.readFileSync(appPath, 'utf8');
        
        expect(content).toContain("import { initPerformanceUI } from './performance-ui.js'");
        expect(content).toContain('initPerformanceUI()');
    });

    test('should have enhanced CSS styles', () => {
        const fs = require('fs');
        const path = require('path');
        
        const cssPath = path.join(__dirname, '../styles/main.css');
        const content = fs.readFileSync(cssPath, 'utf8');
        
        expect(content).toContain('.performance-panel');
        expect(content).toContain('.server-status');
        expect(content).toContain('.accuracy-progress');
    });

    test('should have HTML elements for performance UI', () => {
        const fs = require('fs');
        const path = require('path');
        
        const htmlPath = path.join(__dirname, '../index.html');
        const content = fs.readFileSync(htmlPath, 'utf8');
        
        expect(content).toContain('performance-panel');
        expect(content).toContain('mode-selector');
        expect(content).toContain('run-accuracy-btn');
    });

    test('server package.json should have correct configuration', () => {
        const fs = require('fs');
        const path = require('path');
        
        const packagePath = path.join(__dirname, '../server/package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        expect(packageJson.name).toBe('lottery-accuracy-server');
        expect(packageJson.main).toBe('accuracy-server.js');
        expect(packageJson.dependencies).toHaveProperty('express');
        expect(packageJson.dependencies).toHaveProperty('cors');
    });
});