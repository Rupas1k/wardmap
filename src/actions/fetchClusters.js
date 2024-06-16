import bz2 from 'bz2'

const fetchClusters = async leagueId => {
    let result = await fetch(`${window.location.origin}/static/data/leagues/${leagueId}`);
    let arr = new Uint8Array(await result.arrayBuffer())
    return JSON.parse(new TextDecoder().decode(window.bz2.decompress(arr)));
}

export default fetchClusters
