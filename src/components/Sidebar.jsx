const menuItems = [
    { key: "home", label: "Home" },
    { key: "dashboard", label: "Dashboard" },
    { key: "eventTrace", label: "Event Trace" },
    { key: "raiseTicket", label: "Raise Ticket" },
    { key: "supplierEval", label: "Supplier Eval" },
    { key: "trainingChatbot", label: "Training Chatbot" },
    { key: "okr", label: "OKR System" },
    { key: "labelling", label: "Labelling" },
    { key: "contact", label: "Contact" },
];

export default function Sidebar({ activePage, setActivePage }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h2>TRACE OS</h2>
                <p>Prototype System</p>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.key}
                        className={activePage === item.key ? "active" : ""}
                        onClick={() => setActivePage(item.key)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>
        </aside>
    );
}