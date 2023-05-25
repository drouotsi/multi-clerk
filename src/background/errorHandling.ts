// handleMessageDeliveryError makes sure to only log errors if they are unexpected.
// The expected errors occure when the extension is updated or installed and clerking tabs
// are not refreshed.
// What is feasable is to force the tabs to refresh on extension update, but it seems too radical
export function handleMessageDeliveryError(lastError : chrome.runtime.LastError) {
  const errorMessage = lastError.message;
  // Handle unexpected errors
  // The expected errors are due to the popup not being opened when sending a message to it
  if (errorMessage !== 'Could not establish connection. Receiving end does not exist.'
  && errorMessage !== 'The message port closed before a response was received.') {
    console.error('Unexpected error after sending the updateTabMessage from back : ', lastError.message);
  } 

}