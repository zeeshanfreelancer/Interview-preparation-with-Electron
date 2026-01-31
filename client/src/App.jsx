import { useEffect } from "react";
import LanguageTabs from "./components/LanguageTabs";
import { apiService } from "./services/api";

function App() {
  useEffect(() => {
    // Simple server detection - just use port 3000 from .env
    const detectServer = async () => {
      if (!import.meta.env.PROD) {
        console.log('[APP] Checking server on port 3000 (from .env)...');
      }

      const port = 3000; // Use port from .env file
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        // Test health endpoint
        const healthResponse = await fetch(`http://localhost:${port}/api/health`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (healthResponse.ok) {
          const data = await healthResponse.json();
          if (data.status === 'OK') {
            const serverPort = data.port || port;
            if (!import.meta.env.PROD) {
              console.log(`[APP] ✓ Server found on port ${serverPort} (from .env)`);
            }
            
            // Log database status (only in development)
            if (!import.meta.env.PROD && data.database) {
              const dbStatus = data.database.readyStateText || 'unknown';
              const dbConnected = data.database.connected;
              if (dbConnected) {
                console.log(`[APP] ✓ Database connected (${dbStatus})`);
              } else {
                console.warn(`[APP] ⚠ Database not connected (${dbStatus}) - Questions will not persist`);
              }
            }
            
            window.updateApiBaseUrl(serverPort);
            return true;
          }
        }
        
        throw new Error('Server health check failed');
      } catch (error) {
        if (!import.meta.env.PROD) {
          console.error(`[APP] ✗ Server not responding on port ${port}:`, error.message);
          console.error('[APP] Make sure the server is running on port 3000 (check .env file)');
        }
        throw new Error(`Server not found on port ${port}`);
      }
    };

    // Run detection immediately
    let serverDetected = false;
    const maxDetections = 6;
    let detectionCount = 0;
    let detectionInterval;

    const stopDetection = () => {
      if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
        if (!import.meta.env.PROD) {
          console.log('[APP] Server detection completed, stopping periodic checks');
        }
      }
    };

    const runDetection = async () => {
      if (serverDetected) return; // Skip if already detected

      try {
        await detectServer();
        serverDetected = true;
        stopDetection(); // Stop periodic detection once server is found
      } catch (error) {
        // Continue trying
      }
    };

    // Run detection immediately
    runDetection();

    // Also run detection every 10 seconds for the first 60 seconds (reduced frequency)
    detectionInterval = setInterval(() => {
      detectionCount++;
      if (detectionCount < maxDetections && !serverDetected) {
        runDetection();
      } else {
        stopDetection();
      }
    }, 10000); // Increased from 5000ms to 10000ms to reduce CPU usage

    // Cleanup on unmount
    return () => {
      clearInterval(detectionInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-blue-100">
      <LanguageTabs />
    </div>
  );
}

export default App;
