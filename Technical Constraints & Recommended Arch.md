Technical Constraints & Recommended Architecture
Project Philosophy
The website should prioritize simplicity, clarity, maintainability, and long-term evolvability over technical sophistication or excessive abstraction.
The objective is to create a visually strong and artistically expressive experience while keeping the underlying technical architecture lightweight, understandable, and resilient to future changes.
The project should avoid unnecessary complexity, over-engineering, excessive framework usage, and tightly coupled systems.
The desired result is:
* easy to maintain
* easy to evolve
* easy to reason about
* performant
* visually refined
* stable over time

Core Technical Principles
1. Static-first architecture
The website should primarily be a static site.
Pages should render as static HTML whenever possible, with JavaScript added only where interactivity or visual effects are required.
Avoid SPA-style architecture unless there is a very clear need.
The site should remain fully functional even with minimal JavaScript enabled.

2. Content-first structure
Content is the core of the project and should remain independent from presentation logic.
Artworks, metadata, and textual content should be stored in structured content collections (Markdown or equivalent), allowing:
* easy editing
* scalability
* future redesigns without content migration
* reuse across desktop and mobile experiences
* efficient SEO of images
Content structure should remain stable even if visual presentation evolves significantly.

3. Isolated interactivity
Interactive effects should be modular and self-contained.
Each visual or interactive feature should:
* encapsulate its own logic
* avoid global side effects
* own its event listeners
* support cleanup/destruction
* avoid direct coupling with unrelated components
Interactive modules should not depend on global application state whenever possible.
The preferred model is:
* many small independent effects
* minimal shared runtime complexity
rather than:
* one centralized animation or state management system

4. Progressive complexity
The project should start from a clean and functional static portfolio experience before adding advanced visual effects.
The base experience should already feel complete without requiring heavy interaction systems.
Advanced visual experimentation should be layered progressively and selectively.

5. Mobile-specific simplification
The mobile experience does not need to replicate the desktop experience.
Desktop may prioritize immersion and experimental interaction.
Mobile should prioritize:
* readability
* navigation clarity
* performance
* portfolio browsing
Mobile should intentionally reduce visual and computational complexity where appropriate.

6. Readability over cleverness
Code should optimize for readability and explicitness.
Avoid:
* unnecessary abstraction
* deeply nested architecture
* meta-programming
* overly generic systems
* premature optimization
Prefer:
* small focused modules
* descriptive naming
* explicit behavior
* predictable file organization
The codebase should remain understandable after long periods without maintenance.

Recommended Technology Stack
Frontend Framework
Use Astro as the primary framework.
Rationale:
* static-first architecture
* minimal client-side JavaScript
* strong content handling
* excellent image optimization
* selective hydration for interactive islands
* good long-term maintainability

Styling
Preferred options:
* plain CSS modules
* scoped component CSS
* lightweight utility styling if needed
Avoid introducing heavy styling systems unless clearly justified.
Styling architecture should remain simple and predictable.

JavaScript / TypeScript
Use modern TypeScript modules for all custom interactivity.
Prefer:
* functional modules
* isolated initialization functions
* small reusable utilities
Avoid:
* large class hierarchies
* complex state containers
* unnecessary runtime frameworks

Interactive Components
Use framework islands only where necessary.
Recommended for:
* WebGL scenes
* shader-based experiences
* advanced interaction systems
* isolated immersive sections
Avoid hydrating large portions of the site unnecessarily.

Content Management
Use local content collections rather than a CMS initially.
Recommended:
* Markdown content files
* structured frontmatter metadata
* image references stored alongside content
A headless CMS may be considered later only if editorial workflow complexity justifies it.

Image Pipeline
Use Astro’s image optimization pipeline.
Images should:
* originate from source assets
* generate optimized variants automatically
* support multiple responsive sizes
* support optional manual thumbnail overrides for artistic control
Image logic should be centralized into reusable image components.

Recommended Project Structure
src/
  pages/
  layouts/
  components/
    layout/
    navigation/
    gallery/
    images/
    interactive/

  content/
    works/

  scripts/
    interactions/
    visualizers/

  styles/

  utils/

  config/

public/
  fonts/
  downloads/

Performance Constraints
The site should remain lightweight and performant.
Guidelines:
* minimize JavaScript payloads
* lazy-load heavy interactions
* optimize images aggressively
* avoid unnecessary dependencies
* prefer static rendering whenever possible
Heavy visual effects should only load when needed.

Maintainability Constraints
The architecture should support:
* incremental evolution
* isolated redesigns
* easy debugging
* low regression risk
Each module should have:
* a clear responsibility
* minimal dependencies
* predictable inputs/outputs
Large monolithic files should be avoided.

Development Philosophy
The project should evolve iteratively.
Recommended order:
1. establish architecture
2. establish content model
3. build static experience
4. implement responsive/mobile behavior
5. add interaction systems
6. add advanced visual experimentation selectively
Architecture quality should always take priority over adding features quickly.
