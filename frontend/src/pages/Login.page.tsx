import axios from 'axios';

export function Login() {
    const handleLogin = async () => {
        try {
            const response = await axios.get('http://localhost:8080/auth/login', {
                withCredentials: true
            });

            console.log('Login Response:', response.data);
            window.location.href = response.data.url;
        } catch (error) {
            console.error('Failed to initiate login', error);
        }
    };

    return (
        <div>
            <button onClick={handleLogin}>Login</button>
        </div>
    );
}
