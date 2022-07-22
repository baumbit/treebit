/**
 * TODO
 *      harden
 *          create whitelists
 *          ? Object.freeze if needed
 */
import fs from 'fs';

export function createStaticFileServer(basePath) {
    if(!basePath.endsWith('/public')) {
        // WARNING: while node will scrub any "../" from client request,
        // fs.readFile have access to files even above package.json,
        // hence XXX file exfiltration XXX is possible here if basePath is
        // to high up in the folder structure. there is, to my knowledge,
        // no way of protecting against slippig up here, hence this naiv
        // verification  that at least the base path ends in a word that
        // clearly signals that everything in it and below is accessible.
        throw new Error(`bad basePath(${basePath}). static files must be served from folder ending in '/public'`);
    }
    return function(req, res) {
        const url = req.url;
        fs.readFile(basePath + url, function(err, data) {
            if(err){
                console.error('[static-file-server:500] ' + err); // TODO prevent DDoS by filling up possible file log
                res.statusCode = 500;
                res.end('Internal server error: gremlins'); // intentionally not leaking server error
            } else {
                if(url.endsWith('.js')) res.writeHead(200, { 'Content-Type': 'text/javascript' });
                else if(url.endsWith('.css')) res.writeHead(200, { 'Content-Type': 'text/css' });
                else res.writeHead(200, { 'Content-Type': 'text/plain' });
                //console.log(`Serving static file: "${filePath}"`);
                res.end(data);
            }
        });
    };
};

