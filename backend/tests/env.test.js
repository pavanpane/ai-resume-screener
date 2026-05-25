describe('Environment Variable Setup', () => {
    const originalApiKey = process.env.HUGGING_FACE_API_KEY;

    beforeEach(() => {
        jest.resetModules();
    });

    afterAll(() => {
        process.env.HUGGING_FACE_API_KEY = originalApiKey;
    });

    it('should throw an error if HUGGING_FACE_API_KEY is not set', () => {
        // Unset the environment variable
        delete process.env.HUGGING_FACE_API_KEY;

        // Expect that requiring the controller now throws an error
        expect(() => {
            require('../src/controllers/screeningController');
        }).toThrow();
    });

    it('should not throw an error if HUGGING_FACE_API_KEY is set', () => {
        // Set a dummy environment variable
        process.env.HUGGING_FACE_API_KEY = 'test-key';

        // Expect that requiring the controller does not throw an error
        expect(() => {
            require('../src/controllers/screeningController');
        }).not.toThrow();
    });
});
