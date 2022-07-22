import buffer from 'buffer';
function getSize(data) {
    //const size = Buffer.from(data).size; // TODO is this correct?
    //console.log('getSize data', data, size);
    //return size;
    const blob = new buffer.Blob([data]);
    const size = blob.size;
    console.log('getSize data', data.length, size);
    return size;
}

function getByteLength(data) {
    const buffer = Buffer.from(data, 'utf-8');
    //const blob = new buffer.Blob([data]);
    //const size = blob.size;
    console.log('getByteLength data', data.length, buffer.byteLength);
}

const hello = `{"key":"a45","cnt":1}`;
getSize(hello);
getByteLength(hello);

