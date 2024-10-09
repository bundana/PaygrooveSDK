// (function (window: Window, document: Document) {
//     // Create a namespace for PayGroove
//     const PayGroove: any = {};
//     let CHECKOUT_URL: string = 'https://secure.paygroove.com'; // Use HTTPS for PCI DSS compliance
//
//     // Define options interface
//     interface PaymentOptions {
//         amount: number; // Payment amount in cents
//         currency: string; // Currency code (e.g., USD, EUR)
//         merchantId: string; // Merchant ID
//         email: string; // Customer's email address
//         phone?: string; // Customer's phone number
//         firstName?: string; // Customer's first name
//         lastName?: string; // Customer's last name
//         reference?: string; // Payment reference
//         testPayment?: boolean; // Flag for test payments
//         description?: string; // Payment description
//         channels?: string[]; // Payment channels
//         metadata?: object; // Additional metadata
//         expiring?: string; // Expiration time
//         onSuccess?: (response: any) => void; // Callback for successful payment
//         onFailure?: (error: any) => void; // Callback for failed payment
//     }
//
//     /**
//      * Initialize the inline checkout
//      * @param {PaymentOptions} options - Configuration options
//      */
//     PayGroove.initializePayment = function (options: PaymentOptions) {
//
//         // Function to capture and sanitize HTTP Referrer
//         const getHttpReferrer = (): string => {
//             const referrer = document.referrer || window.location.href || 'Direct Access';
//             return sanitizeReferrer(referrer);
//         };
//
//         // Validate required fields
//         const requiredFields = ['amount', 'currency', 'merchantId', 'email'];
//         const missingFields = requiredFields.filter(field => !options[field as keyof PaymentOptions]);
//         if (missingFields.length > 0) {
//             console.error(`PayGroove: Missing required payment options: ${missingFields.join(', ')}`);
//             options.onFailure && options.onFailure({
//                 error: 'Missing required fields',
//                 details: missingFields,
//                 referrer: getHttpReferrer() // Include referrer if needed
//             });
//             return;
//         }
//
//         if (options.testPayment) {
//             CHECKOUT_URL = 'http://127.0.0.1:8000';
//         }
//
//         // Tokenize sensitive data
//         const tokenize = (data: object): string => {
//             return btoa(JSON.stringify(data)); // Placeholder for actual tokenization
//         };
//
//         const sensitiveData = tokenize({
//             email: options.email,
//             phone: options.phone,
//             firstName: options.firstName,
//             lastName: options.lastName
//         });
//
//
//         const sanitizeReferrer = (referrer: string): string => {
//             // Simple sanitization: encode URI components to prevent injection
//             return encodeURIComponent(referrer);
//         };
//
//         const httpReferrer = getHttpReferrer();
//
//         // Create overlay
//         const overlay = document.createElement('div');
//         overlay.style.position = 'fixed';
//         overlay.style.top = '0';
//         overlay.style.left = '0';
//         overlay.style.width = '100%';
//         overlay.style.height = '100%';
//         overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
//         overlay.style.zIndex = '9998';
//
//         // Create spinner
//         const spinner = document.createElement('div');
//         spinner.innerHTML = ` <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
//                 <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" stroke-width="5">
//                     <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 25 25" to="360 25 25" repeatCount="indefinite"/>
//                 </circle>
//             </svg>`;
//         spinner.style.position = 'fixed';
//         spinner.style.top = '50%';
//         spinner.style.left = '50%';
//         spinner.style.transform = 'translate(-50%, -50%)';
//         spinner.style.zIndex = '10000';
//
//         // Create the iframe
//         const queryParams = new URLSearchParams({
//             merchantId: options.merchantId,
//             amount: options.amount.toString(),
//             currency: options.currency,
//             reference: options.reference || '',
//             phone: options.phone || '',
//             firstName: options.firstName || '',
//             lastName: options.lastName || '',
//             testPayment: options.testPayment ? 'true' : 'false',
//             description: options.description || '',
//             channels: JSON.stringify(options.channels || []),
//             metadata: JSON.stringify(options.metadata || {}),
//             expiring: options.expiring || '',
//             sensitiveData: sensitiveData,
//             referrer: httpReferrer // ✅ Added referrer here
//         });
//
//         const iframe = document.createElement('iframe');
//         iframe.src = `${CHECKOUT_URL}/checkout/momo?${queryParams.toString()}`;
//
//         // Set iframe styles
//         iframe.style.position = 'fixed';
//         iframe.style.top = '50%';
//         iframe.style.left = '50%';
//         iframe.style.transform = 'translate(-50%, -50%)';
//         iframe.style.border = 'none';
//         iframe.style.zIndex = '9999';
//         iframe.style.backgroundColor = '#ffffff';
//         iframe.style.display = 'none'; // Hide initially
//
//         // Create a close button
//         const closeButton = document.createElement('button');
//         closeButton.innerHTML = '&times;';
//         closeButton.style.position = 'fixed';
//         closeButton.style.top = '20px';
//         closeButton.style.right = '20px';
//         closeButton.style.fontSize = '30px';
//         closeButton.style.color = '#fff';
//         closeButton.style.background = 'rgba(0, 0, 0, 0.5)';
//         closeButton.style.borderRadius = '50%';
//         closeButton.style.width = '40px';
//         closeButton.style.height = '40px';
//         closeButton.style.border = 'none';
//         closeButton.style.cursor = 'pointer';
//         closeButton.style.zIndex = '10001';
//         closeButton.style.display = 'none'; // Hide initially
//
//         // Function to set styles based on screen size
//         const setResponsiveStyles = () => {
//             if (window.innerWidth <= 768) { // Mobile styles
//                 iframe.style.width = '100vw';      // Full viewport width
//                 iframe.style.height = '100vh';     // Full viewport height
//                 iframe.style.borderRadius = '0';    // No border radius for full screen
//                 iframe.style.boxShadow = 'none';    // Remove shadow for a cleaner look
//                 closeButton.style.display = 'none'; // hide close button
//             } else { // Desktop styles
//                 iframe.style.width = '100%';
//                 iframe.style.height = '100%';
//                 iframe.style.maxWidth = 'none';
//                 iframe.style.maxHeight = 'none';
//                 iframe.style.borderRadius = '0';
//                 iframe.style.boxShadow = 'none';
//                 closeButton.style.display = 'block'; // show close button
//             }
//         };
//
//         // Set initial styles
//         setResponsiveStyles();
//
//         // Update styles on window resize
//         window.addEventListener('resize', setResponsiveStyles);
//
//         // Close function
//         const closeCheckout = function () {
//             document.body.removeChild(overlay);
//             document.body.removeChild(spinner);
//             document.body.removeChild(iframe);
//             document.body.removeChild(closeButton);
//             window.removeEventListener('resize', setResponsiveStyles);
//             options.onFailure && options.onFailure({
//                 error: 'Payment Cancelled',
//                 details: 'User closed the payment window',
//                 referrer: httpReferrer // ✅ Include referrer here
//             });
//         };
//
//         // Close the iframe when the close button is clicked
//         closeButton.onclick = closeCheckout;
//
//         // Append elements to the body
//         document.body.appendChild(overlay);
//         document.body.appendChild(spinner);
//         document.body.appendChild(iframe);
//         if (window.innerWidth >= 768 && iframe) {
//             document.body.appendChild(closeButton);
//         }
//
//         // Show iframe and close button when loaded
//         iframe.onload = function () {
//             spinner.style.display = 'none';
//             iframe.style.display = 'block';
//             closeButton.style.display = window.innerWidth >= 768 ? 'block' : 'none'; // Set based on screen size
//         };
//
//         // Listen for messages from the iframe
//         window.addEventListener('message', function (event) {
//             if (event.origin !== CHECKOUT_URL) {
//                 console.error('PayGroove: Received message from untrusted origin');
//                 return;
//             }
//
//             try {
//                 let data: any;
//                 if (typeof event.data === 'string') {
//                     data = JSON.parse(event.data);
//                 } else if (typeof event.data === 'object') {
//                     data = event.data;
//                 } else {
//                     throw new Error('Unexpected message format');
//                 }
//
//                 switch (data.type) {
//                     case 'cancel-payment':
//                         closeCheckout();
//                         break;
//                     case 'payment-success':
//                         options.onSuccess && options.onSuccess({
//                             ...data.payload,
//                             referrer: httpReferrer // ✅ Include referrer here
//                         });
//                         closeCheckout();
//                         break;
//                     case 'payment-failure':
//                         options.onFailure && options.onFailure({
//                             ...data.payload,
//                             referrer: httpReferrer // ✅ Include referrer here
//                         });
//                         closeCheckout();
//                         break;
//                     case 'close':
//                         closeCheckout();
//                         break;
//                     default:
//                         console.warn('PayGroove: Unknown message type:', data.type);
//                 }
//             } catch (error) {
//                 console.error('PayGroove: Error processing message:', error);
//             }
//         });
//     };
//
//     // Expose PayGroove globally
//     (window as any).PayGroove = PayGroove;
// })(window, document);
