const UPLOAD_INTERVAL_SECONDS = 20;

export const config = {

// === CLIENT SERVER ====
    // polling
        // how many millis to cache server response to client request (many different clients may ask for same thing)
    LOG_CACHE: true,
    SERVER_CACHE_ENABLED: false,
    CLIENT_CACHE_ENABLED: false,
    CLIENT_CONTINOUS_POLLING_DISABLED: true,
    SERVER_RESOURCE_API_ONDEMAND_DISABLED: true,
    CACHE_TTL: 1000*60, // TODO add client or/both server prrefeix?!
    CACHE_MAX_TTL: 1000*60*60*24*7, // TODO add client or/both server prrefeix?!
    SERVER_RENDERING_DISABLED: true,


// === NODE/PEER NETWORK ===
    // polling
    UPLOAD_INTERVAL_SECONDS,

    // quota
    //UPLOAD_QUOTA: 10,
    UPLOAD_QUOTA: 100000,
    UPLOAD_QUOTA_DEFAULT_GRACE: 10000,
    UPLOAD_QUOTA_RESET_EARNED_SECONDS: UPLOAD_INTERVAL_SECONDS,
    UPLOAD_QUOTA_RESET_GRACE_SECONDS: 4 * UPLOAD_INTERVAL_SECONDS,
    UPLOAD_QUOTA_MAX_AVAILABLE: 100,

    // poll
    POLL_INTERVAL_SECONDS: 5,
    //DOWNLOAD_MAX_NOTES: 4000,
    //DOWNLOAD_MAX_SCORES: 4000,
    DOWNLOAD_MAX_NOTES: 4,
    //DOWNLOAD_MAX_SCORES: 4,

    // factor less then zero will decrease the cost,
    // one is neutral,
    // above will increase the cost.
    // TODO PROCESS_QUOTA_FACTOR:   0, when there is work being performed that generate no result
    QUOTA_FACTOR_SCORES: 0,
    UPLOAD_QUOTA_FACTOR_NOTE:   0,
    UPLOAD_QUOTA_FACTOR_SIGNER: 0,
    UPLOAD_QUOTA_FACTOR_ERROR:  0
    //QUOTA_FACTOR_SCORES: 1,
    //UPLOAD_QUOTA_FACTOR_NOTE: 1.2,
    //UPLOAD_QUOTA_FACTOR_SIGNER: 1,
    //UPLOAD_QUOTA_FACTOR_ERROR: 1.01

};

