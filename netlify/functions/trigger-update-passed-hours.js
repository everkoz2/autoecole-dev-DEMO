const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Add retries for reliability
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(
          `${process.env.VITE_SUPABASE_URL}/functions/v1/update-passed-hours`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Successfully triggered update-passed-hours',
            data
          })
        };
      } catch (error) {
        lastError = error;
        // Only retry if we haven't reached max retries
        if (i === maxRetries - 1) throw error;
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw lastError;
  } catch (error) {
    console.error('Error in trigger-update-passed-hours:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};