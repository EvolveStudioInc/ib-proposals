export default {
  async fetch(request, env) {
    // Get the response from the static assets
    const response = await env.ASSETS.fetch(request);

    // Only modify HTML responses
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    // Read CF_Authorization cookie from the request
    const cookieHeader = request.headers.get('cookie') || '';
    let userEmail = '';

    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const parts = cookie.trim().split('=');
      const name = parts.shift();
      const val = parts.join('=');
      if (name === 'CF_Authorization' && val) {
        try {
          const payload = JSON.parse(atob(val.split('.')[1]));
          userEmail = payload.email || '';
        } catch (e) {
          userEmail = '';
        }
        break;
      }
    }

    // Inject the email as a global JS variable into the HTML
    const originalText = await response.text();
    const injected = originalText.replace(
      '<head>',
      `<head><script>window.CF_USER_EMAIL="${userEmail}";</script>`
    );

    return new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
};
