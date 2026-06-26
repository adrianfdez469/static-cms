"use client";

import { useState, useEffect } from 'react';
import { listContentRoutes } from "@/lib/contentBuilder";
import Link from "next/link";


export default function Home() {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        listContentRoutes().then(setRoutes).finally(() => setLoading(false));
    }, []);

    return (
        <div className="home-page">
            <header className="home-intro">
                <div className="home-intro-top">
                    <h1>Static CMS</h1>
                    <Link href="/admin" className="home-admin-link">
                        Admin
                    </Link>
                </div>
                <p>
                    Public index of pages published from storage. Each route is
                    Markdown content wrapped in a shared HTML template.
                </p>
            </header>

            <section className="home-docs" aria-labelledby="how-to-use">
                <h2 id="how-to-use">How to use this site</h2>
                <ol>
                    <li>
                        Browse the list below and open any route to view its
                        rendered page.
                    </li>
                    <li>
                        To create, edit, or delete pages, go to the{" "}
                        <Link href="/admin">admin panel</Link>. Content is stored
                        as <code>content/&lt;slug&gt;/index.md</code> files.
                    </li>
                    <li>
                        Layout and styling for all public pages come from a single{" "}
                        <code>template.html</code>, which you can edit in the
                        admin.
                    </li>
                    <li>
                        If no pages appear below, open the admin and initialize
                        the storage bucket, then add your first page.
                    </li>
                </ol>
            </section>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
            <section className="home-routes" aria-labelledby="available-pages">
                <h2 id="available-pages">Available pages</h2>
                {routes && routes.length === 0 ? (
                    <p className="home-empty">
                        No published pages yet.{" "}
                        <Link href="/admin">Create one in the admin</Link>.
                    </p>
                ) : (
                    
                        <ul>
                            {routes.map((route) => (
                                <li key={route}>
                                    <Link href={route}>{route}</Link>
                                </li>
                            ))}
                        </ul>
                    
                )}
            </section>
            )}
        </div>
    );
}
