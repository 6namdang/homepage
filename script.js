// CONFIGURATION: Add your markdown files here
const blogFiles = [
    "first-blog.md",
    "interview-grader.md"
];

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
            metadata[key] = []; // Initialize as array to catch potential list items
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
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    const listContainer = document.getElementById('blog-list-container');
    if (listContainer) {
        const params = new URLSearchParams(window.location.search);
        const postFilename = params.get('post');

        if (postFilename) {
            await loadSinglePost(postFilename);
        } else {
            await loadBlogList();
        }
    }
}

async function loadBlogList() {
    const listContainer = document.getElementById('blog-list-container');
    const detailContainer = document.getElementById('view-blog-detail');
    const viewWriting = document.getElementById('view-writing');
    const viewProjects = document.getElementById('view-projects');

    if (viewWriting) viewWriting.classList.remove('hidden');
    if (detailContainer) detailContainer.classList.add('hidden');

    const posts = [];
    for (const file of blogFiles) {
        try {
            const res = await fetch(`posts/${file}`);
            if (res.ok) {
                const text = await res.text();
                const { metadata } = parseFrontmatter(text);
                posts.push({ ...metadata, filename: file });
            }
        } catch (e) { console.error(e); }
    }

    // Determine if we are on projects.html or writings.html
    const isProjectPage = window.location.pathname.includes('projects.html');
    
    // Filter: if tags contain 'projects', put in projects, else put in writing
    const filteredPosts = posts.filter(post => {
        const hasProjectTag = post.tags && Array.isArray(post.tags) && post.tags.includes('projects');
        return isProjectPage ? hasProjectTag : !hasProjectTag;
    });

    listContainer.innerHTML = filteredPosts.map(post => {
        const tagsHtml = (post.tags && Array.isArray(post.tags)) 
            ? `<div class="flex flex-wrap gap-2 mt-2">
                ${post.tags.map(tag => `<span class="text-[10px] uppercase tracking-widest text-stone-500 border border-stone-800 px-1.5 py-0.5 rounded">${tag}</span>`).join('')}
               </div>` 
            : '';

        return `
            <a href="?post=${post.filename}" class="group cursor-pointer flex items-baseline justify-between py-5 border-b border-stone-800 hover:border-stone-700 transition-colors">
                <div class="pr-4">
                    <h3 class="text-sm md:text-base font-medium text-stone-300 group-hover:text-stone-100 transition-colors">${post.title}</h3>
                    ${tagsHtml}
                    <p class="text-xs text-stone-500 mt-2">${post.readTime}</p>
                </div>
                <span class="text-xs text-stone-600 shrink-0 font-mono">${post.date}</span>
            </a>
        `;
    }).join('');
}
async function loadSinglePost(filename) {
    const viewWriting = document.getElementById('view-writing');
    const detailContainer = document.getElementById('view-blog-detail');

    viewWriting.classList.add('hidden');
    detailContainer.classList.remove('hidden');

    try {
        const res = await fetch(`posts/${filename}`);
        if (!res.ok) throw new Error("Post not found");
        const text = await res.text();
        const { metadata, content } = parseFrontmatter(text);
        const contentHtml = marked.parse(content);

        const imageUrl = metadata.image?.url || metadata.image; // Fallback if image is a string
        const imageAlt = metadata.image?.alt || metadata.title || '';
        const imageHeader = imageUrl 
            ? `<img src="${imageUrl}" alt="${imageAlt}" class="w-full mb-6 rounded-lg object-contain max-h-[450px] bg-stone-900/20">` 
            : '';

        // Tag logic for single post view
        const tagsHtml = (metadata.tags && Array.isArray(metadata.tags))
            ? `<div class="flex flex-wrap gap-2 mb-6">
                ${metadata.tags.map(tag => `<span class="text-xs font-medium text-stone-400 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-full">#${tag}</span>`).join('')}
               </div>`
            : '';

        detailContainer.innerHTML = `
            <article class="max-w-2xl mx-auto">
                <a href="writings.html" class="inline-flex items-center gap-2 text-stone-500 hover:text-stone-100 hover:bg-stone-800/80 transition-colors mb-4 text-sm px-2 py-1 -ml-2 rounded-md cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    back
                </a>
                <h1 class="text-2xl md:text-3xl font-medium text-white mb-2">${metadata.title}</h1>
                <p class="text-stone-500 text-sm mb-4">hoang nam dang · ${metadata.date} · ${metadata.readTime}</p>
                
                ${tagsHtml}
                ${imageHeader}
                
                <hr class="border-stone-800 mb-8">
                
                <div class="prose prose-invert prose-stone max-w-none text-xs md:text-sm leading-relaxed space-y-4">
                    ${contentHtml}
                </div>
                
                <div class="mt-10 pt-6 border-t border-stone-800 flex items-center justify-between">
                     <p class="text-stone-600 text-xs italic">Thanks for reading.</p>
                </div>
            </article>
        `;
        window.scrollTo(0,0);
    } catch(e) {
        console.error(e);
        detailContainer.innerHTML = `<p class="text-red-500">Error loading post.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});