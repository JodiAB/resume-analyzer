import {Link} from "react-router";

const Navbar = () => {
    return (
        <nav className="navbar flex-wrap gap-3">
            <Link to="/">
                <p className="text-2xl font-bold text-gradient">CareerCrafter</p>
            </Link>
            <Link to="/profile" className="font-semibold">Candidate profile</Link>
            <Link to="/jobs" className="font-semibold">Discover jobs</Link>
            <Link to="/applications" className="font-semibold">Applications</Link>
            <Link to="/prepare" className="font-semibold">Prepare documents</Link>
            <Link to="/upload" className="primary-button w-fit">
                Upload Resume
            </Link>
        </nav>
    )
}
export default Navbar
