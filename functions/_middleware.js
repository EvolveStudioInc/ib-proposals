export async function onRequest(context) {
  const response = await context.next();

  // Only process HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Read CF_Authorization cookie from the incoming request
  const cookieHeader = context.request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(function(c) {
      const parts = c.trim().split('=');
      const key = parts.shift();
      const val = parts.join('=');
      return [key, val];
    })
  );

  // Decode the JWT to extract the user's email
  let userEmail = '';
  const jwt = cookies['CF_Authorization'];
  if (jwt) {
    try {
      // JWT is three base64 sections separated by dots
      // The middle section (index 1) is the payload containing the email
      const payloadBase64 = jwt.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      userEmail = payload.email || '';
    } catch (e) {
      userEmail = '';
    }
  }

  // Read the original HTML response
  const originalText = await response.text();

  // Inject a script tag right after <head> that sets the email as a global variable
  // The app reads window.CF_USER_EMAIL to get the logged-in user's email
  const injected = originalText.replace(
    '<head>',
    '<head><script>window.CF_USER_EMAIL="' + userEmail + '";</script>'
  );

  // Return the modified HTML with the same status and headers
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
