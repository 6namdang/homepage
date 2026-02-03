const blogSettings = {
    username: "6namdang", // Update this
    repo: "6namdang",           // Update this
    folder: "posts",                  // The folder containing your .md files
    branch: "main"                    // Usually 'main' or 'master'
};

/**
 * Utility: Fetch file list from GitHub
 */
async function getBlogFiles() {
    const apiUrl = `https://api.github.com/repos/${blogSettings.username}/${blogSettings.repo}/contents/${blogSettings.folder}?ref=${blogSettings.branch}`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("GitHub API unreachable");
        const data = await response.json();
        return data
            .filter(item => item.name.endsWith('.md'))
            .map(item => item.name);
    } catch (e) {
        console.error("Error fetching blog list:", e);
        return [];
    }
}

/**
 * Utility: Get raw content URL
 */
function getRawUrl(filename) {
    return `https://raw.githubusercontent.com/${blogSettings.username}/${blogSettings.repo}/${blogSettings.branch}/${blogSettings.folder}/${filename}`;
}

// --- PARSER ENGINE ---
function parseFrontmatter(text) {
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
    const match = text.match(frontmatterRegex);
    if (!match) return { metadata: {}, content: text };

    const yamlBlock = match[1];
    const content = text.replace(frontmatterRegex, '').trim();
    const metadata = {};

    let currentParent = null;
    let currentArrayKey = null;

    yamlBlock.split('\n').forEach(rawLine => {
        const line = rawLine.replace(/\r/g, '');
        if (!line.trim()) return;

        const isIndented = line.startsWith('  ');
        const isListItem = isIndented && line.trim().startsWith('- ');

        if (isListItem && currentArrayKey) {
            metadata[currentArrayKey].push(line.trim().replace('- ', '').trim());
            return;
        }

        const [keyPart, ...valueParts] = line.trim().split(':');
        const key = keyPart.trim();
        let value = valueParts.join(':').trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (isIndented && currentParent && value) {
            metadata[currentParent][key] = value;
            return;
        }

        if (value === '') {
            metadata[key] = []; 
            currentParent = key;
            currentArrayKey = key;
            return;
        }

        if (value.includes(',')) {
            metadata[key] = value.split(',').map(v => v.trim());
            currentArrayKey = null;
            currentParent = null;
            return;
        }

        metadata[key] = value;
        currentParent = null;
        currentArrayKey = null;
    });

    return { metadata, content };
}

// --- APP LOGIC ---
async function init() {
    // 1. Mobile Menu Logic
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    // 2. Routing Logic (Post vs List)
    const params = new URLSearchParams(window.location.search);
    const postFilename = params.get('post');

    if (postFilename) {
        await loadSinglePost(postFilename);
    } else {
        await loadBlogList();
    }
}

async function loadBlogList() {
    const listContainer = document.getElementById('blog-list-container');
    const detailContainer = document.getElementById('view-blog-detail');
    const listView = document.getElementById('view-home') || document.getElementById('view-projects') || document.getElementById('view-writing');

    if (listView) listView.classList.remove('hidden');
    if (detailContainer) detailContainer.classList.add('hidden');
    if (listContainer) listContainer.innerHTML = '<p class="text-stone-600 text-sm italic">Fetching posts...</p>';

    // AUTO-DISCOVERY INSTEAD OF HARDCODED ARRAY
    const files = await getBlogFiles();
    const posts = [];

    // Parallel fetch for speed
    const fetchPromises = files.map(async (file) => {
        try {
            const res = await fetch(getRawUrl(file));
            if (res.ok) {
                const text = await res.text();
                const { metadata } = parseFrontmatter(text);
                return { ...metadata, filename: file };
            }
        } catch (e) { console.error("Error loading file:", file, e); }
        return null;
    });

    const results = await Promise.all(fetchPromises);
    const validPosts = results.filter(p => p !== null);

    if (listContainer) {
        if (validPosts.length === 0) {
            listContainer.innerHTML = '<p class="text-stone-600 text-sm">No posts found.</p>';
            return;
        }

        listContainer.innerHTML = validPosts.map(post => {
            const tagsHtml = (post.tags && Array.isArray(post.tags)) 
                ? `<div class="flex flex-wrap gap-2 mt-2">
                    ${post.tags.map(tag => `<span class="text-[10px] uppercase tracking-widest text-stone-200 border border-stone-800 px-1.5 py-0.5 rounded">${tag}</span>`).join('')}
                   </div>` 
                : '';

            return `
                <a href="?post=${post.filename}" class="group cursor-pointer flex items-baseline justify-between py-5 border-b border-stone-800 hover:border-stone-700 transition-colors">
                    <div class="pr-4">
                        <h3 class="text-sm md:text-base font-medium text-stone-300 group-hover:text-stone-100 transition-colors">${post.title}</h3>
                        ${tagsHtml}
                        <p class="text-xs text-stone-500 mt-2">${post.readTime || ''}</p>
                    </div>
                    <span class="text-xs text-stone-600 shrink-0 font-mono">${post.date || ''}</span>
                </a>
            `;
        }).join('');
    }
}

async function loadSinglePost(filename) {
    const detailContainer = document.getElementById('view-blog-detail');
    const listViews = [document.getElementById('view-home'), document.getElementById('view-projects'), document.getElementById('view-writing')];

    listViews.forEach(view => { if (view) view.classList.add('hidden'); });
    if (detailContainer) detailContainer.classList.remove('hidden');

    try {
        const res = await fetch(getRawUrl(filename));
        if (!res.ok) throw new Error("Post not found");
        const text = await res.text();
        const { metadata, content } = parseFrontmatter(text);
        
        const contentHtml = typeof marked !== 'undefined' ? marked.parse(content) : content;
        const imageUrl = metadata.image?.url || metadata.image;
        const imageAlt = metadata.image?.alt || metadata.title || '';
        const imageHeader = imageUrl 
            ? `<img src="${imageUrl}" alt="${imageAlt}" class="w-full mb-8 rounded-lg object-contain max-h-[450px] bg-stone-900/20">` 
            : '';

        const tagsHtml = (metadata.tags && Array.isArray(metadata.tags))
            ? `<div class="flex flex-wrap gap-2 mb-6">
                ${metadata.tags.map(tag => `<span class="text-xs font-medium text-stone-400 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-full">#${tag}</span>`).join('')}
               </div>`
            : '';

        detailContainer.innerHTML = `
            <div class="flex items-center justify-between mb-8 md:mb-12">
                <a href="${window.location.pathname}" class="group inline-flex items-center gap-2 text-stone-500 hover:text-stone-100 transition-colors text-sm py-1 cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="group-hover:-translate-x-1 transition-transform">
                        <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                    back
                </a>
            </div>

            <article class="max-w-2xl mx-auto fade-in">
                <h1 class="text-2xl md:text-3xl font-medium text-white mb-2 leading-tight">${metadata.title}</h1>
                <p class="text-stone-500 text-sm mb-6">${metadata.author || 'Hoang Nam Dang'} · ${metadata.date} · ${metadata.readTime}</p>
                
                ${tagsHtml}
                ${imageHeader}
                
                <hr class="border-stone-800 mb-10">
                
                <div class="prose prose-invert prose-stone max-w-none text-sm md:text-base leading-relaxed space-y-4 text-stone-100 prose-p:text-stone-100 prose-headings:text-white">
                    ${contentHtml}
                </div>
                
                <div class="mt-16 pt-6 border-t border-stone-800 flex items-center justify-between">
                     <p class="text-stone-600 text-xs italic">Thanks for reading.</p>
                     <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="text-stone-500 hover:text-stone-100 text-xs transition-colors">↑ scroll to top</button>
                </div>
            </article>
        `;
        window.scrollTo(0,0);
    } catch(e) {
        console.error(e);
        if (detailContainer) detailContainer.innerHTML = `<p class="text-red-500">Error loading post.</p><a href="${window.location.pathname}" class="text-white underline">Go back</a>`;
    }
}

document.addEventListener('DOMContentLoaded', init);