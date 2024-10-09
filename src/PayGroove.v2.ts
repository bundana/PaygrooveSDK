(function (window: Window, document: Document) {
    // Create a namespace for PayGroove
    const PayGroove: any = {};
    let CHECKOUT_URL: string = 'https://secure.paygroove.com'; // Use HTTPS for PCI DSS compliance

    // Flag to prevent multiple initializations
    PayGroove.initializing = false;

    // Define options interface
    interface PaymentOptions {
        amount: number; // Payment amount in cents
        currency: string; // Currency code (e.g., USD, EUR)
        public_key: string; // Merchant ID
        email: string; // Customer's email address
        phone?: string; // Customer's phone number
        firstName?: string; // Customer's first name
        lastName?: string; // Customer's last name
        reference?: string; // Payment reference
        testPayment?: boolean; // Flag for test payments
        description?: string; // Payment description
        channels?: string[]; // Payment channels
        metadata?: Record<string, any>; // Additional metadata
        expiring?: string; // Expiration time
        onSuccess?: (response: any) => void; // Callback for successful payment
        onFailure?: (error: any) => void; // Callback for failed payment
    }

    // Define message event interface
    interface PaymentMessage {
        type: string;
        payload?: any;
    }

    /**
     * Initialize the inline checkout
     * @param {PaymentOptions} options - Configuration options
     */
    PayGroove.initializePayment = function (options: PaymentOptions) {
        if (PayGroove.initializing) {
            console.warn('PayGroove: Payment is already initializing.');
            return;
        }
        PayGroove.initializing = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9998';

        // Create spinner
        const spinner1 = `
<svg width="50" height="50"
xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><linearGradient id='a11'><stop offset='0' stop-color='#000000' stop-opacity='0'></stop><stop offset='1' stop-color='#000000'></stop></linearGradient><circle fill='none' stroke='url(#a11)' stroke-width='26' stroke-linecap='round' stroke-dasharray='0 44 0 44 0 44 0 44 0 360' cx='100' cy='100' r='70' transform-origin='center'><animateTransform type='rotate' attributeName='transform' calcMode='discrete' dur='2' values='360;324;288;252;216;180;144;108;72;36' repeatCount='indefinite'></animateTransform></circle></svg>`;

        const spinner2 = ` <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" stroke-width="5">
                    <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 25 25" to="360 25 25" repeatCount="indefinite"/>
                </circle>
            </svg>`;

        const spinner = document.createElement('div');
        spinner.innerHTML = spinner1;
        spinner.style.position = 'fixed';
        spinner.style.top = '50%';
        spinner.style.left = '50%';
        spinner.style.transform = 'translate(-50%, -50%)';
        spinner.style.zIndex = '10000';

        /**
         * Debounce function to limit the rate at which a function can fire.
         * @param func The function to debounce.
         * @param wait The debounce interval in milliseconds.
         */
        function debounce(func: () => void, wait: number) {
            let timeout: number | undefined;
            return () => {
                if (timeout !== undefined) {
                    clearTimeout(timeout);
                }
                timeout = window.setTimeout(func, wait);
            };
        }

        // Close function
        const cleanup = function () {
            [overlay, spinner, iframe, closeButton].forEach(element => {
                if (document.body.contains(element)) {
                    document.body.removeChild(element);
                }
            });
            window.removeEventListener('resize', debouncedSetResponsiveStyles);
            window.removeEventListener('message', messageHandler, false);
            PayGroove.initializing = false;
        };

        const sanitizeReferrer = (referrer: string): string => {
            // Simple sanitization: encode URI components to prevent injection
            return encodeURIComponent(referrer);
        };

        // Function to capture and sanitize HTTP Referrer
        const getHttpReferrer = (): string => {
            const referrer = document.referrer || window.location.href || 'Direct Access';
            return sanitizeReferrer(referrer);
        };

        // Validate required fields
        const requiredFields: (keyof PaymentOptions)[] = ['amount', 'currency', 'public_key', 'email'];
        const missingFields = requiredFields.filter(field => !options[field]);
        if (missingFields.length > 0) {
            // console.error(`PayGroove: Missing required payment options: ${missingFields.join(', ')}`);
            options.onFailure && options.onFailure({
                error: 'Missing required fields',
                details: missingFields,
                referrer: getHttpReferrer() // Include referrer if needed
            });
            cleanup();
            return;
        }

        if (options.testPayment) {
            CHECKOUT_URL = 'http://127.0.0.1:8000';
        }

        // Tokenize sensitive data
        const tokenize = (data: object): string => {
            // Replace this with a secure tokenization/encryption mechanism
            // Example: return secureEncrypt(JSON.stringify(data));
            return btoa(JSON.stringify(data)); // Placeholder for actual tokenization
        };

        const sensitiveData = tokenize({
            email: options.email,
            phone: options.phone,
            firstName: options.firstName,
            lastName: options.lastName
        });

        const httpReferrer = getHttpReferrer();

        const paymentData = {
            public_key: options.public_key,
            amount: options.amount,
            currency: options.currency,
            reference: options.reference || '',
            phone: options.phone || '',
            firstName: options.firstName || '',
            lastName: options.lastName || '',
            testPayment: options.testPayment || false,
            description: options.description || '',
            channels: JSON.stringify(options.channels || []),
            metadata: JSON.stringify(options.metadata || {}),
            expiring: options.expiring || '',
            referrer: httpReferrer // ✅ Added referrer here
        };

        const sensitivePaymentData = tokenize(paymentData);

        // Prepare query parameters
        const sensitivePaymentDataFromUrl = new URLSearchParams({
            public_key: options.public_key,
            amount: options.amount.toString(),
            currency: options.currency,
            reference: options.reference || '',
            phone: options.phone || '',
            firstName: options.firstName || '',
            lastName: options.lastName || '',
            testPayment: options.testPayment ? 'true' : 'false',
            description: options.description || '',
            channels: JSON.stringify(options.channels || []),
            metadata: JSON.stringify(options.metadata || {}),
            expiring: options.expiring || '',
            referrer: httpReferrer // ✅ Added referrer here
        }).toString();

        const queryParams = sensitivePaymentData || sensitivePaymentDataFromUrl.toString();

        /**
         * Creates a new order by sending a POST request to the backend.
         *
         * @param {Object} order - The order details to be sent to the server.
         * @returns {Object} - The response data from the server.
         * @throws {Error} - Throws an error if the request fails.
         */
        async function createOrder(order: object) {
            const token = btoa(options.public_key); // Consider a more secure token generation
            try {
                const response = await fetch(`${CHECKOUT_URL}/checkout/initialize`, {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json', // Set the content type to JSON
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        token: sensitivePaymentData // Stringify the entire body, including the tokenized order data
                    })
                });

                // Check if the response status is OK (status code 200-299)
                if (!response.ok) {
                    // Attempt to parse the error message from the response
                    const errorData = await response.json();
                    const errorMessage = errorData.message || 'Failed to create order';
                    options.onFailure && options.onFailure({
                        error: errorMessage
                    });
                    cleanup();
                    throw new Error(errorMessage);
                }

                // Parse the response data as JSON
                return await response.json(); // Return the successful response data
            } catch (error: any) {
                // console.error('Error creating order:', error);
                // Re-throw the error to be handled by the calling function
                options.onFailure && options.onFailure({
                    error: 'Server error',
                    details: error.message,
                    referrer: httpReferrer // ✅ Include referrer here
                });
                cleanup();
                throw error;
            }
        }

        const iframe = document.createElement('iframe');

        // Set iframe styles
        iframe.style.position = 'fixed';
        iframe.style.top = '50%';
        iframe.style.left = '50%';
        iframe.style.transform = 'translate(-50%, -50%)';
        iframe.style.border = 'none';
        iframe.style.zIndex = '9999';
        iframe.style.backgroundColor = '#ffffff';
        iframe.style.display = 'none'; // Hide initially
        iframe.setAttribute('allow', 'payment'); // Example: allow payment-related features
        iframe.setAttribute('title', 'PayGroove Payment');

        // Create a close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'fixed';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.fontSize = '30px';
        closeButton.style.color = '#fff';
        closeButton.style.background = 'rgba(0, 0, 0, 0.5)';
        closeButton.style.borderRadius = '50%';
        closeButton.style.width = '40px';
        closeButton.style.height = '40px';
        closeButton.style.border = 'none';
        closeButton.style.cursor = 'pointer';
        closeButton.style.zIndex = '10001';
        closeButton.style.display = 'none'; // Hide initially

        // Accessibility enhancements
        closeButton.setAttribute('aria-label', 'Close Payment Window');
        closeButton.setAttribute('tabindex', '0');

        // Function to set styles based on screen size
        // Function to set styles based on screen size
        const setResponsiveStyles = () => {
            if (window.innerWidth <= 768) { // Mobile styles
                iframe.style.width = '100vw';      // Full viewport width
                iframe.style.height = '100vh';     // Full viewport height
                iframe.style.borderRadius = '0';    // No border radius for full screen
                iframe.style.boxShadow = 'none';    // Remove shadow for a cleaner look
                closeButton.style.display = 'none'; // hide close button
            } else { // Desktop styles
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.maxWidth = 'none';
                iframe.style.maxHeight = 'none';
                iframe.style.borderRadius = '0';
                iframe.style.boxShadow = 'none';
                closeButton.style.display = 'block'; // show close button
            }
        };

        // Debounced resize handler
        const debouncedSetResponsiveStyles = debounce(setResponsiveStyles, 150);

        // Set initial styles
        setResponsiveStyles();

        // Update styles on window resize
        window.addEventListener('resize', debouncedSetResponsiveStyles);


        // Close the iframe when the close button is clicked
        closeButton.onclick = closeCheckout;

        function closeCheckout() {
            options.onFailure && options.onFailure({
                error: 'Payment Cancelled',
                details: 'User closed the payment window',
                referrer: httpReferrer // ✅ Include referrer here
            });
            cleanup();
        }

        // Append elements to the body
        document.body.appendChild(overlay);
        document.body.appendChild(spinner);
        document.body.appendChild(iframe);
        if (window.innerWidth > 768) {
            document.body.appendChild(closeButton);
        }

        // Call createOrder with the payment data
        createOrder(paymentData).then(order => {
            const orderId = order?.data?.reference;
            // If the order was created successfully, show the iframe
            if (order && order?.data && orderId) {
                // Show iframe with the order token
                iframe.src = `${CHECKOUT_URL}/checkout/momo/${encodeURIComponent(orderId)}`;
                // Show iframe and close button when loaded
                iframe.onload = function () {
                    spinner.style.display = 'none';
                    iframe.style.display = 'block';
                    closeButton.style.display = window.innerWidth >= 768 ? 'block' : 'none'; // Set based on screen size
                };
            } else {
                // Handle any cases where the order doesn't return a valid token
                options.onFailure && options.onFailure({
                    error: 'Invalid order response',
                    referrer: httpReferrer
                });
                cleanup();
            }
        }).catch(err => {
            // Handle errors during order creation
            // console.error('Error during order creation:', err);
        });

        // Message event handler
        const messageHandler = function (event: MessageEvent) {
            if (event.origin !== CHECKOUT_URL) {
                console.error('PayGroove: Received message from untrusted origin');
                return;
            }

            try {
                let data: PaymentMessage;
                if (typeof event.data === 'string') {
                    data = JSON.parse(event.data);
                } else if (typeof event.data === 'object') {
                    data = event.data;
                } else {
                    throw new Error('Unexpected message format');
                }

                switch (data.type) {
                    case 'cancel-payment':
                        closeCheckout();
                        break;
                    case 'payment-success':
                        options.onSuccess && options.onSuccess({
                            ...data.payload,
                            referrer: httpReferrer // ✅ Include referrer here
                        });
                        cleanup();
                        break;
                    case 'payment-failure':
                        options.onFailure && options.onFailure({
                            ...data.payload,
                            referrer: httpReferrer // ✅ Include referrer here
                        });
                        cleanup();
                        break;
                    case 'payment-error':
                        // console.error('PayGroove: Payment error', data.payload);
                        options.onFailure && options.onFailure({
                            error: 'Payment Error',
                            details: data.payload,
                            referrer: httpReferrer // ✅ Include referrer here
                        });
                        cleanup();
                        break;
                    default:
                        // console.warn('PayGroove: Unhandled message type', data.type);
                }
            } catch (error: any) {
                // console.error('PayGroove: Error processing message', error);
                options.onFailure && options.onFailure({
                    error: 'Message Processing Error',
                    details: error.message,
                    referrer: httpReferrer // ✅ Include referrer here
                });
            }
        };

        // Listen for messages from the iframe
        window.addEventListener('message', messageHandler, false);
    };

    // Expose PayGroove globally
    (window as any).PayGroove = PayGroove;
})(window, document);
