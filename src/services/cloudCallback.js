// Convert the existing WebSocket callbacks without introducing another transport.
export function cloudCallback(send) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Cloud response timed out')), 30000);
    send((response) => {
      clearTimeout(timer);
      response?.success ? resolve(response.data) : reject(new Error(response?.message || 'Cloud operation failed'));
    });
  });
}
