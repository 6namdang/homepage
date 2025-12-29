// CONFIGURATION: Add your markdown files here
const blogFiles = [
    "first-blog.md", 
    // "another-post.md"
];

// --- PARSER ENGINE ---
function parseFrontmatter(text) {
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
    const match = text.match(frontmatterRegex);
    if (!match) return { metadata: {}, content: text };

    const yamlBlock = match[1];
    const content = text.replace(frontmatterRegex, '').trim();
    const metadata = {};
    
    // Simple state machine to handle one level of nesting
    let currentParent = null;

    yamlBlock.split('\n').forEach(line => {
        if (!line.trim()) return;
        
        // Check for indentation (2 spaces) indicating a nested property
        const isNested = line.startsWith('  ') || line.startsWith('    ');
        const [keyPart, ...valueParts] = line.split(':');
        const key = keyPart.trim();
        let value = valueParts.join(':').trim();
        
        // Clean up quotes
        if (value.startsWith("'") || value.startsWith('"')) value = value.slice(1, -1);

        if (!isNested) {
            if (value === "") {
                // Potential parent object (like image:)
                metadata[key] = {};
                currentParent = key;
            } else {
                metadata[key] = value;
                currentParent = null;
            }
        } else if (currentParent) {
            // It's a child property (like url: or alt:)
            metadata[currentParent][key] = value;
        }
    });

    return { metadata, content };
}
// --- APP LOGIC ---
async function init() {
    // Mobile Menu Logic (Preserved from original)
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

    // Writing Page Logic
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

    // Toggle views
    viewWriting.classList.remove('hidden');
    detailContainer.classList.add('hidden');

    const posts = [];
    for (const file of blogFiles) {
        try {
            const res = await fetch(`./posts/${file}`);
            if (res.ok) {
                const text = await res.text();
                const { metadata } = parseFrontmatter(text);
                posts.push({ ...metadata, filename: file });
            }
        } catch (e) { console.error(e); }
    }

    // EXACT HTML STRUCTURE FROM YOUR ORIGINAL CODE
    listContainer.innerHTML = posts.map(post => `
        <a href="?post=${post.filename}" class="group cursor-pointer flex items-baseline justify-between py-2 border-b border-stone-800 hover:border-stone-600 transition-colors">
            <div>
                <h3 class="text-sm md:text-base font-medium text-stone-300 group-hover:text-stone-100 transition-colors">${post.title}</h3>
                <p class="text-xs text-stone-500 mt-1">${post.readTime}</p>
            </div>
            <span class="text-xs text-stone-500 shrink-0">${post.date}</span>
        </a>
    `).join('');
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

        // 1. Check if image URL actually exists in metadata
        const imageUrl = metadata.image?.url;
        const imageAlt = metadata.image?.alt || metadata.title || '';

        // 2. Create the Image HTML only if imageUrl is present
        const imageHeader = imageUrl 
            ? `<img src="${imageUrl}" alt="${imageAlt}" class="w-full mb-6 rounded-lg object-contain max-h-[450px] bg-stone-900/20">` 
            : '';

        detailContainer.innerHTML = `
            <article class="max-w-lg mx-auto">
                <a href="writings.html" class="inline-flex items-center gap-2 text-stone-500 hover:text-stone-100 hover:bg-stone-800/80 transition-colors mb-4 text-sm px-2 py-1 -ml-2 rounded-md cursor-pointer">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    back
                </a>
                <h1 class="text-2xl md:text-3xl font-medium text-white mb-2">${metadata.title}</h1>
                <p class="text-stone-500 text-sm mb-6">hoang nam dang · ${metadata.date} · ${metadata.readTime}</p>
                
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
document.addEventListener('DOMContentLoaded', init);