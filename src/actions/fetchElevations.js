const fetchElevations = async mapVersion => {
    return await (await fetch(`${window.location.origin}/static/data/elevations/${mapVersion}.json`)).json()
}

export default fetchElevations