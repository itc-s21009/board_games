const btnSubmit = document.getElementById('submit')
btnSubmit.onclick = async () => {
    const name = document.getElementById('username').value
    if (name) {
        const data = {name: name}
        await fetch(`./api/name`, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((r) => {
            if (r.status === 200) {
                window.location.href = '/'
            }
        })
    }
}