const fetchElevations = async mapVersion => {
    return await (await fetch(`${window.location.origin}/static/data/${mapVersion}/elevations.json`)).json()
}

export default fetchElevations