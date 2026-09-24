import './logout.css';

function Logout({ onLogin }) {
	return (
		<main className="logout-page">
			<section className="logout-card" aria-labelledby="logout-title">
				<div className="logout-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
				<h1 id="logout-title">You are logged out</h1>
				<p>Your session has ended successfully.</p>
				<button type="button" onClick={onLogin}>Login again</button>
			</section>
		</main>
	);
}

export default Logout;
