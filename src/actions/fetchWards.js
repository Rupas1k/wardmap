const fetchWards = async () => {
    return await (await fetch("http://127.0.0.1:5000/get_wards")).json()
}

export default fetchWards