export async function createNoteScoresAsync(ß, peerProxy, log) {
   return peerProxy.getLufoStoreAsync('notescores');
};

