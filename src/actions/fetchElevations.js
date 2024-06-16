import bz2 from 'bz2'

const fetchElevations = async mapVersion => {
    let result = window.bz2.decompress(new Uint8Array(await (await fetch(`${window.location.origin}/static/data/elevations/${mapVersion}`)).arrayBuffer()));
    let dataView = new DataView(result.buffer)
    let rows = dataView.getUint16(0)
    let cols = dataView.getUint16(2)

    const merged = [];
    let offset = 4;
    for (let i = 0; i < rows; i++) {
        let row = [];
        for (let j = 0; j < cols; j++) {
            row.push(dataView.getInt16(offset));
            offset += 2;
        }
        merged.push(row);
    }

    return merged
}

export default fetchElevations
