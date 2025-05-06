import { useState } from "react";
import api from "../api";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Form.css";

function Form({route, method}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const isLogin = method === "login";
    const title = isLogin ? "Login" : "Register";
    const buttonText = isLogin ? "Login" : "Sign Up";

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();

        try{
            const res = await api.post(route, { username, password })
            if (isLogin) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
                navigate("/")
            } else {
                navigate("/login")
            }
        } catch (error) {
            alert(error)
        } finally {
            setLoading(false)
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-left-panel">
                <div className="welcome-content">
                    <h1>Welcome to Em-prove Journal</h1>
                    <p>An application designed to help traders & investors track their performance and emotions to improve their executions.</p>
                </div>
            </div>
            <div className="auth-right-panel">
                <div className="form-wrapper">
                    <div className="back-link">
                        
                    </div>
                    
                    <h2 className="form-title">{title}</h2>
                    {!isLogin && <p className="account-prompt">Already have an account? <Link to="/login">Log in</Link></p>}
                    {isLogin && <p className="account-prompt">Don't have an account? <Link to="/register">Register</Link></p>}
                    
                    <form onSubmit={handleSubmit} className="form-container">
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input 
                                id="username"
                                className="form-input"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input 
                                id="password"
                                className="form-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        
                        <button 
                            className="form-button" 
                            type="submit" 
                            disabled={loading}
                        >
                            {loading ? "Processing..." : buttonText}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Form