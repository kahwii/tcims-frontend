import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import EstablishmentRegister from './EstablishmentRegister';
import { BASE } from '../api/api';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tourist'); // 'tourist' | 'establishment'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${BASE}/register.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // tourist self sign-up
        body: JSON.stringify({ username, password, role: 'tourist' }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Registered! Redirecting to login...');
        setUsername('');
        setPassword('');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Could not connect to server');
    }
  };

  // Establishments get the full DOT-style accreditation registration form.
  if (role === 'establishment') {
    return <EstablishmentRegister onSwitchToTourist={() => setRole('tourist')} />;
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7v2h20V7L12 2zM4 10v9h2v-9H4zm14 0v9h2v-9h-2zm-9 0v9h2v-9H9zm5 0v9h2v-9h-2zM2 21v2h20v-2H2z"/></svg>
        </div>
        <h1>Be@Mandaluyong</h1>
        <p>{role === 'establishment' ? 'Register your establishment for accreditation' : 'Create your tourist account'}</p>
      </div>

      <div className="auth-card">
        <form onSubmit={handleSubmit} autoComplete="off" className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="form-group">
            <label>I am registering as</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setRole('tourist')}
                style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                         border: role === 'tourist' ? '2px solid #2563eb' : '1px solid #d1d5db',
                         background: role === 'tourist' ? '#eff6ff' : '#fff', color: role === 'tourist' ? '#2563eb' : '#374151' }}
              > Tourist</button>
              <button
                type="button"
                onClick={() => setRole('establishment')}
                style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                         border: role === 'establishment' ? '2px solid #0d9488' : '1px solid #d1d5db',
                         background: role === 'establishment' ? '#f0fdfa' : '#fff', color: role === 'establishment' ? '#0d9488' : '#374151' }}
              > Establishment</button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 8 1.34 8 4v2H4v-2c0-2.66 5.3-4 8-4zm0-2a4 4 0 110-8 4 4 0 010 8z"/></svg>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24"><path d="M12 17a2 2 0 002-2 2 2 0 00-2-2 2 2 0 00-2 2 2 2 0 002 2zm6-9a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h1V6a5 5 0 0110 0v2h1zm-6-5a3 3 0 00-3 3v2h6V6a3 3 0 00-3-3z"/></svg>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">Create account</button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;