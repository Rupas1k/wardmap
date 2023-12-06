const fetchClusters = async leagueId => {
    // return await (await fetch(`http://192.168.1.196:5000/get_clusters/${leagueId}`)).json()
    return await (await fetch(`${window.location.origin}/static/data/leagues/${leagueId}.json`)).json()
}

export default fetchClusters
