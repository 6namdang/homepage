const projectSettings = {
    username: "6namdang", // Update this
    repo: "6namdang",           // Update this
    folder: "projects",               // The folder containing your .md files
    branch: "main"                    // Usually 'main' or 'master'
};

/**
 * Utility: Fetch file list from GitHub
 */
async function getProjectFiles() {
    const apiUrl = `https://api.github.com/repos/${projectSettings.username}/${projectSettings.repo}/contents/${projectSettings.folder}?ref=${projectSettings.branch}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("GitHub API unreachable");
        
        const data = await response.json();
        // Filter for Markdown files only
        return data
            .filter(item => item.name.endsWith('.md'))
            .map(item => item.name);
    } catch (e) {
        console.error("Error fetching project list:", e);
        return [];
    }
}

/**
 * Utility: Get the raw content URL for a specific file
 */
function getRawUrl(filename) {
    return `https://raw.githubusercontent.com/${projectSettings.username}/${projectSettings.repo}/${projectSettings.branch}/${projectSettings.folder}/${filename}`;
}

async function initProjects() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');

    if (projectId) {
        await renderProjectDetail(projectId);
    } else {
        await renderProjectGrid();
    }
}

async function renderProjectGrid() {
    const container = document.getElementById('project-list-container');
    const listView = document.getElementById('view-projects');
    const detailView = document.getElementById('view-blog-detail');

    if (listView) listView.classList.remove('hidden');
    if (detailView) detailView.classList.add('hidden');
    if (container) container.innerHTML = '<p class="text-stone-500">Loading projects...</p>';

    const files = await getProjectFiles();
    
    if (files.length === 0) {
        if (container) container.innerHTML = '<p class="text-stone-500">No projects found.</p>';
        return;
    }

    let gridHtml = `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;

    // Process all files in parallel for speed
    const projectPromises = files.map(async (file) => {
        try {
            const res = await fetch(getRawUrl(file));
            if (!res.ok) return '';
            
            const text = await res.text();
            const { metadata } = parseFrontmatter(text);

            return `
                <a href="?project=${file}" class="group block no-underline">
                    <div class="h-full border border-stone-800 rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-stone-600 hover:shadow-xl bg-stone-900/20">
                        ${metadata.img ? `
                            <img src="${metadata.img}" alt="${metadata.title}" class="w-full h-40 object-cover grayscale group-hover:grayscale-0 transition-all duration-500">
                        ` : ''}
                        <div class="p-4">
                            <h2 class="text-stone-100 font-semibold text-lg mb-1">${metadata.title}</h2>
                            <p class="text-stone-400 text-xs md:text-sm italic">${metadata.description || ''}</p>
                        </div>
                    </div>
                </a>
            `;
        } catch (e) {
            console.error(`Error loading ${file}:`, e);
            return '';
        }
    });

    const results = await Promise.all(projectPromises);
    gridHtml += results.join('') + `</div>`;
    
    if (container) container.innerHTML = gridHtml;
}

async function renderProjectDetail(filename) {
    const listView = document.getElementById('view-projects');
    const detailView = document.getElementById('view-blog-detail');

    if (listView) listView.classList.add('hidden');
    if (detailView) detailView.classList.remove('hidden');
    detailView.innerHTML = '<p class="text-stone-500 text-center mt-20">Loading project details...</p>';

    try {
        const res = await fetch(getRawUrl(filename));
        if (!res.ok) throw new Error("File not found");

        const text = await res.text();
        const { metadata, content } = parseFrontmatter(text);
        const contentHtml = typeof marked !== 'undefined' ? marked.parse(content) : content;

        detailView.innerHTML = `
            <div class="post mb-20 fade-in">
                <header class="post-header mb-10 border-b border-stone-800 pb-8">
                    <a href="projects.html" class="text-stone-500 hover:text-stone-100 text-xs uppercase tracking-widest mb-6 inline-block transition-colors">← Back to Portfolio</a>
                    <h1 class="text-3xl md:text-5xl font-bold text-white mb-4">${metadata.title}</h1>
                    <p class="text-xl text-stone-400 font-light italic">${metadata.description || ''}</p>
                </header>

                <article class="prose prose-invert prose-stone max-w-none 
                    prose-p:text-stone-200 prose-p:leading-relaxed 
                    prose-headings:text-stone-100 prose-img:rounded-xl">
                    ${contentHtml}
                </article>
            </div>
        `;
        window.scrollTo(0, 0);
    } catch (e) {
        detailView.innerHTML = `
            <div class="text-center mt-20">
                <p class="text-red-500 mb-4">Failed to load project details.</p>
                <a href="projects.html" class="text-stone-400 underline">Return to Grid</a>
            </div>
        `;
    }
}

// Start the script
document.addEventListener('DOMContentLoaded', initProjects);