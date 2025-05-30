module.exports = {
    apps: [{
        name: "lucky-spin-wheel",
        script: "server.js",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "500M",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        },
        env_production: {
            NODE_ENV: "production",
            PORT: 3000
        }
    }]
}; 