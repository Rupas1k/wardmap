const fetchClusters = async leagueId => {
    return await (await fetch(`http://192.168.1.196:5000/get_clusters/${leagueId}`)).json()
    // return await (await fetch(`${window.location.origin}/get_clusters/${leagueId}`)).json()
}

export default fetchClusters
