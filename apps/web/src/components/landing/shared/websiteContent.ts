export type CompanyBlock = { title: string; paragraphs: string[]; items: string[]; status?: string; blocks: CompanyBlock[] };
export type CompanyTopic = "about" | "identity" | "purpose" | "vision" | "mission" | "values" | "services" | "products" | "expertise" | "technologies" | "industries" | "research" | "process" | "engineering" | "why" | "engagements" | "careers" | "teams" | "partnerships" | "security" | "resources" | "roadmap" | "global" | "commitment" | "faq" | "contact" | "cta" | "footer" | "availability";
export const websiteIntroduction = [
  "Transforming ideas into secure, scalable and innovative technology solutions.",
  "HEXVAULT is an emerging technology company focused on software development, cybersecurity, artificial intelligence, enterprise solutions, business automation and digital innovation.",
  "We aim to build technology that solves real-world problems, simplifies business operations, improves productivity and empowers organizations to grow in an increasingly digital world."
];

export const websiteContent: Record<CompanyTopic, CompanyBlock> = {
  "about": {
    "title": "About HEXVAULT",
    "paragraphs": [
      "HEXVAULT is a technology-driven initiative established with the vision of developing a comprehensive ecosystem of digital products, software services and innovative technology solutions.",
      "Our focus extends beyond traditional software development. We aim to combine software engineering, cybersecurity, artificial intelligence, research, automation and modern infrastructure to create reliable and sustainable digital solutions.",
      "We believe that technology should not simply exist to replace traditional processes. It should improve them, strengthen them and create new opportunities.",
      "From developing custom applications to building independent enterprise software products, HEXVAULT aims to support individuals, startups, small businesses and large organizations throughout their digital transformation journey.",
      "We are continuously expanding our technical capabilities, developing new products and exploring emerging technologies."
    ],
    "items": [],
    "blocks": []
  },
  "identity": {
    "title": "Our Identity",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "SECURE",
        "paragraphs": [
          "Security is a fundamental part of our technology philosophy.",
          "We aim to develop software with appropriate security controls, privacy considerations, reliable authentication, responsible data management and secure engineering practices."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "BUILD",
        "paragraphs": [
          "We transform ideas and business requirements into functional digital products.",
          "Our focus is on building practical, scalable, maintainable and user-friendly software that addresses real-world challenges."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "INNOVATE",
        "paragraphs": [
          "We believe continuous innovation is essential for technological progress.",
          "Through research, experimentation, artificial intelligence and emerging technologies, we aim to discover better ways of solving problems and delivering solutions."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "purpose": {
    "title": "Our Purpose",
    "paragraphs": [
      "The purpose of HEXVAULT is to bridge the gap between business challenges and modern technology.",
      "Our objectives are to:"
    ],
    "items": [
      "Develop innovative digital products.",
      "Deliver customized software solutions.",
      "Simplify complex business operations.",
      "Improve organizational productivity.",
      "Promote secure software development.",
      "Automate repetitive business processes.",
      "Support startups and growing businesses.",
      "Make enterprise technology more accessible.",
      "Encourage research and technological innovation.",
      "Create professional development opportunities.",
      "Build sustainable digital infrastructure.",
      "Support digital transformation.",
      "Develop long-term technology partnerships.",
      "Contribute to the advancement of technology."
    ],
    "blocks": []
  },
  "vision": {
    "title": "Our Vision",
    "paragraphs": [
      "To become a globally recognized technology company delivering secure, intelligent and innovative digital solutions that empower businesses, individuals and communities.",
      "We envision a future where HEXVAULT operates as a comprehensive technology ecosystem consisting of independent software products, enterprise platforms, cybersecurity solutions, artificial intelligence systems and research initiatives."
    ],
    "items": [],
    "blocks": []
  },
  "mission": {
    "title": "Our Mission",
    "paragraphs": [
      "To design, develop and deliver reliable technology solutions through responsible engineering, continuous innovation, security-focused practices and customer-centric development.",
      "Our mission is to create technology that delivers practical value while maintaining a commitment to quality, transparency, accessibility and long-term sustainability."
    ],
    "items": [],
    "blocks": []
  },
  "values": {
    "title": "Our Core Values",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "Innovation",
        "paragraphs": [
          "Continuously exploring new ideas, technologies and opportunities to create better solutions."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Security",
        "paragraphs": [
          "Considering security and privacy throughout the software development lifecycle."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Integrity",
        "paragraphs": [
          "Maintaining honesty, transparency and professional ethics."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Quality",
        "paragraphs": [
          "Focusing on reliable, maintainable and effective technology solutions."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Accountability",
        "paragraphs": [
          "Taking responsibility for our decisions, work and commitments."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Collaboration",
        "paragraphs": [
          "Encouraging teamwork, knowledge sharing and professional growth."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Customer Focus",
        "paragraphs": [
          "Understanding customer requirements and developing solutions that address their needs."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Continuous Learning",
        "paragraphs": [
          "Improving our knowledge, technical capabilities and development processes."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Sustainability",
        "paragraphs": [
          "Building technology with long-term reliability and maintainability in mind."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "services": {
    "title": "Our Services",
    "paragraphs": [
      "HEXVAULT aims to provide a comprehensive range of technology services. Service availability depends on current capabilities, project requirements and development progress."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Custom Software Development",
        "paragraphs": [
          "Customized software solutions designed around the specific requirements of businesses and organizations.",
          "Services include:"
        ],
        "items": [
          "Custom business software",
          "Enterprise application development",
          "Management information systems",
          "Desktop applications",
          "Cloud-based applications",
          "Internal business tools",
          "Software integration",
          "Legacy software modernization",
          "Database-driven applications",
          "Software maintenance",
          "Subscription-based applications",
          "Industry-specific software"
        ],
        "blocks": []
      },
      {
        "title": "Web Development",
        "paragraphs": [
          "Development of modern, responsive and scalable websites and web applications.",
          "Services include:"
        ],
        "items": [
          "Corporate websites",
          "Business websites",
          "Portfolio websites",
          "Landing pages",
          "E-commerce websites",
          "SaaS platforms",
          "Full-stack web applications",
          "Administrative dashboards",
          "Customer portals",
          "Progressive web applications",
          "Content management systems",
          "Website redesign",
          "Website maintenance",
          "Web application integration"
        ],
        "blocks": []
      },
      {
        "title": "Mobile Application Development",
        "paragraphs": [
          "Mobile applications designed to provide reliable and intuitive digital experiences.",
          "Services include:"
        ],
        "items": [
          "Android application development",
          "iOS application development",
          "Cross-platform development",
          "Business management applications",
          "E-commerce applications",
          "Customer-facing applications",
          "Employee management applications",
          "Mobile application integration",
          "Application modernization",
          "Mobile application maintenance"
        ],
        "blocks": []
      },
      {
        "title": "UI/UX Design",
        "paragraphs": [
          "Creating digital experiences that balance functionality, accessibility and visual design.",
          "Services include:"
        ],
        "items": [
          "User interface design",
          "User experience design",
          "Product design",
          "Website design",
          "Mobile application design",
          "Dashboard design",
          "Wireframing",
          "Interactive prototyping",
          "Design systems",
          "User journey mapping",
          "Usability evaluation",
          "Interface modernization",
          "Responsive design"
        ],
        "blocks": []
      },
      {
        "title": "Backend Development and API Engineering",
        "paragraphs": [
          "Building reliable backend infrastructure that supports modern applications.",
          "Services include:"
        ],
        "items": [
          "Backend application development",
          "REST API development",
          "Database architecture",
          "Authentication systems",
          "Authorization systems",
          "Role-based access control",
          "Third-party API integration",
          "Payment gateway integration",
          "Real-time communication systems",
          "Microservices architecture",
          "Server-side development",
          "Backend performance optimization",
          "Data processing systems",
          "Notification services"
        ],
        "blocks": []
      },
      {
        "title": "Enterprise Software Solutions",
        "paragraphs": [
          "Digital platforms designed to simplify and centralize organizational operations.",
          "Solutions include:"
        ],
        "items": [
          "Enterprise resource planning systems",
          "Customer relationship management systems",
          "Human resource management systems",
          "Workforce management systems",
          "Inventory management systems",
          "Billing and invoicing systems",
          "Sales management systems",
          "Supplier management systems",
          "Document management systems",
          "Project management systems",
          "Business reporting systems",
          "Multi-branch management platforms"
        ],
        "blocks": []
      },
      {
        "title": "SaaS Development",
        "paragraphs": [
          "Development of Software as a Service platforms that support subscription-based business models.",
          "Services include:"
        ],
        "items": [
          "Multi-tenant architecture",
          "Subscription management",
          "Customer onboarding systems",
          "Tenant management",
          "Feature-based access control",
          "Software licensing",
          "Administrative dashboards",
          "Usage monitoring",
          "SaaS product development",
          "SaaS application maintenance",
          "Customer management",
          "Cloud-based software platforms"
        ],
        "blocks": []
      },
      {
        "title": "Business Automation",
        "paragraphs": [
          "Helping businesses reduce manual work and improve operational efficiency.",
          "Solutions include:"
        ],
        "items": [
          "Workflow automation",
          "Attendance automation",
          "Employee management automation",
          "Inventory automation",
          "Billing automation",
          "Invoice generation",
          "Customer support automation",
          "Reporting automation",
          "Email automation",
          "Notification systems",
          "Business process digitization",
          "Application integration",
          "Document processing",
          "Approval workflows"
        ],
        "blocks": []
      },
      {
        "title": "E-Commerce Development",
        "paragraphs": [
          "Digital commerce solutions for retailers, wholesalers and online businesses.",
          "Services include:"
        ],
        "items": [
          "Single-vendor e-commerce platforms",
          "Multi-vendor marketplaces",
          "Online storefronts",
          "Product catalog management",
          "Order management",
          "Customer management",
          "Inventory management",
          "Multi-warehouse management",
          "Payment integration",
          "Discount and coupon systems",
          "Sales analytics",
          "Delivery management integration",
          "Administrative dashboards"
        ],
        "blocks": []
      },
      {
        "title": "Software Testing and Quality Assurance",
        "paragraphs": [
          "Structured testing services designed to improve software functionality and reliability.",
          "Services include:"
        ],
        "items": [
          "Manual testing",
          "Automated testing",
          "Functional testing",
          "Regression testing",
          "API testing",
          "Integration testing",
          "Performance testing",
          "Compatibility testing",
          "Usability testing",
          "User acceptance testing",
          "Bug identification",
          "Bug reporting",
          "Test documentation",
          "Quality assurance consulting"
        ],
        "blocks": []
      },
      {
        "title": "Cybersecurity Services",
        "paragraphs": [
          "HEXVAULT aims to establish cybersecurity capabilities focused on protecting digital systems and helping organizations manage security risks.",
          "Planned services include:",
          "All security assessments will be performed only with appropriate authorization and clearly defined scopes."
        ],
        "items": [
          "Vulnerability assessment",
          "Authorized penetration testing",
          "Web application security assessment",
          "API security assessment",
          "Network security assessment",
          "Security auditing",
          "Secure code review",
          "Security configuration assessment",
          "Digital risk assessment",
          "Security awareness training",
          "Security monitoring",
          "Incident response consulting",
          "Security architecture consulting",
          "Cybersecurity consulting",
          "Responsible vulnerability disclosure support"
        ],
        "blocks": [],
        "status": "Planned"
      },
      {
        "title": "Artificial Intelligence and Machine Learning",
        "paragraphs": [
          "Developing intelligent technology solutions that support productivity, automation and decision-making.",
          "Planned services include:"
        ],
        "items": [
          "AI-powered chatbots",
          "AI customer support systems",
          "AI business assistants",
          "AI application integration",
          "Machine learning applications",
          "Natural language processing",
          "Predictive analytics",
          "Recommendation systems",
          "Intelligent document processing",
          "Knowledge management systems",
          "AI workflow automation",
          "Intelligent reporting",
          "AI-powered search",
          "Custom AI solutions",
          "Intelligent agents"
        ],
        "blocks": [],
        "status": "Planned"
      },
      {
        "title": "Cloud Computing and DevOps",
        "paragraphs": [
          "Supporting reliable application deployment and scalable digital infrastructure.",
          "Focus areas include:"
        ],
        "items": [
          "Cloud application deployment",
          "Cloud infrastructure management",
          "Cloud migration",
          "CI/CD implementation",
          "Containerization",
          "Infrastructure automation",
          "Database deployment",
          "Application monitoring",
          "Server management",
          "Backup and recovery planning",
          "Performance optimization",
          "Deployment automation",
          "Environment configuration",
          "Infrastructure consulting"
        ],
        "blocks": [],
        "status": "Expanding Capabilities"
      },
      {
        "title": "Data Analytics and Business Intelligence",
        "paragraphs": [
          "Helping organizations transform business data into meaningful information.",
          "Planned solutions include:"
        ],
        "items": [
          "Business analytics dashboards",
          "Data visualization",
          "Automated reporting",
          "Sales analytics",
          "Operational analytics",
          "Customer analytics",
          "Performance monitoring",
          "Data integration",
          "Business intelligence systems",
          "Predictive business insights"
        ],
        "blocks": [],
        "status": "Planned"
      },
      {
        "title": "IT Consulting and Digital Transformation",
        "paragraphs": [
          "Providing technology guidance to startups, businesses and organizations.",
          "Planned services include:"
        ],
        "items": [
          "Technology stack selection",
          "Software architecture consulting",
          "Digital transformation planning",
          "Product development consulting",
          "Technical feasibility analysis",
          "Infrastructure planning",
          "Software modernization",
          "Business process analysis",
          "Technology adoption planning",
          "Startup technology consulting",
          "Enterprise technology consulting"
        ],
        "blocks": [],
        "status": "Planned"
      },
      {
        "title": "Software Maintenance and Technical Support",
        "paragraphs": [
          "Supporting the continued functionality and reliability of software products.",
          "Services may include:"
        ],
        "items": [
          "Application maintenance",
          "Bug fixes",
          "Software updates",
          "Feature enhancements",
          "Security updates",
          "Database maintenance",
          "Technical troubleshooting",
          "Performance improvements",
          "Application monitoring",
          "Deployment support",
          "Technical documentation"
        ],
        "blocks": []
      }
    ]
  },
  "products": {
    "title": "Our Products",
    "paragraphs": [
      "HEXVAULT aims to establish an ecosystem of independent software products designed to address industry-specific and organizational challenges.",
      "Our products may operate as standalone platforms or as interconnected components of a larger technology ecosystem."
    ],
    "items": [],
    "blocks": [
      {
        "title": "HEXVAULT Restaurant ERP",
        "paragraphs": [
          "A comprehensive restaurant management platform designed for restaurants, cafés, food courts and hospitality businesses.",
          "The platform aims to centralize restaurant operations within a unified digital ecosystem."
        ],
        "items": [],
        "blocks": [
          {
            "title": "Administration",
            "paragraphs": [],
            "items": [
              "Multi-tenant management",
              "Restaurant registration",
              "Subscription management",
              "Account activation and suspension",
              "Global administration",
              "Branch management",
              "Role-based access control"
            ],
            "blocks": []
          },
          {
            "title": "Restaurant Operations",
            "paragraphs": [],
            "items": [
              "Restaurant dashboard",
              "Multi-branch management",
              "Table management",
              "Interactive floor layouts",
              "QR code management",
              "Digital menus",
              "Order management",
              "Waiter and captain management",
              "Kitchen order tickets",
              "Kitchen display systems"
            ],
            "blocks": []
          },
          {
            "title": "Billing and Finance",
            "paragraphs": [],
            "items": [
              "POS and billing",
              "Invoice management",
              "Payment management",
              "Tax and GST management",
              "Expense management",
              "Discounts and coupons",
              "Sales analytics",
              "Financial reports"
            ],
            "blocks": []
          },
          {
            "title": "Inventory and Procurement",
            "paragraphs": [],
            "items": [
              "Inventory management",
              "Stock tracking",
              "Supplier management",
              "Purchase orders",
              "Product management",
              "Category management",
              "Stock reports"
            ],
            "blocks": []
          },
          {
            "title": "Workforce Management",
            "paragraphs": [],
            "items": [
              "Employee management",
              "Attendance tracking",
              "Staff assignments",
              "Role management",
              "Internal communication",
              "Activity logs"
            ],
            "blocks": []
          },
          {
            "title": "Customer Experience",
            "paragraphs": [],
            "items": [
              "QR-based digital ordering",
              "Customer profiles",
              "Customer feedback",
              "Order tracking",
              "Takeaway management",
              "Delivery management",
              "Digital billing",
              "Payment integration"
            ],
            "blocks": []
          },
          {
            "title": "Future Enhancements",
            "paragraphs": [],
            "items": [
              "AI-powered customer support",
              "Intelligent business analytics",
              "Demand forecasting",
              "Automated inventory recommendations",
              "Advanced reporting",
              "Intelligent business assistants"
            ],
            "blocks": []
          }
        ],
        "status": "In Development"
      },
      {
        "title": "HEXVAULT Workforce OS",
        "paragraphs": [
          "A centralized workforce and organizational management platform designed to simplify employee administration, productivity and internal operations."
        ],
        "items": [],
        "blocks": [
          {
            "title": "Core Features",
            "paragraphs": [],
            "items": [
              "Employee management",
              "Attendance tracking",
              "Task management",
              "Department management",
              "Organizational hierarchy",
              "Role-based permissions",
              "Employee onboarding",
              "Employee offboarding",
              "Employee status management",
              "Document management",
              "Leave management",
              "Internal announcements",
              "Internal communication",
              "Performance tracking",
              "Activity monitoring",
              "Audit logs",
              "Administrative dashboards",
              "Organizational reporting"
            ],
            "blocks": []
          },
          {
            "title": "Organizational Hierarchy",
            "paragraphs": [
              "The platform aims to provide organizations with a centralized environment for managing their workforce and daily operations."
            ],
            "items": [
              "Owner",
              "Department Head",
              "Manager",
              "Team Lead",
              "Staff"
            ],
            "blocks": []
          }
        ],
        "status": "In Development"
      },
      {
        "title": "HEXVAULT Commerce",
        "paragraphs": [
          "A digital commerce ecosystem designed for retailers, wholesalers and online businesses.",
          "Planned features include:"
        ],
        "items": [
          "Single-vendor storefronts",
          "Multi-vendor marketplaces",
          "Product management",
          "Order management",
          "Inventory management",
          "Multi-warehouse management",
          "Customer management",
          "Payment integration",
          "Seller management",
          "Discount management",
          "Sales analytics",
          "Business reporting"
        ],
        "blocks": [],
        "status": "Proposed Product"
      },
      {
        "title": "HEXVAULT CRM",
        "paragraphs": [
          "A customer relationship management platform designed to simplify customer interactions, lead management and sales operations.",
          "Planned features include:"
        ],
        "items": [
          "Lead management",
          "Customer profiles",
          "Sales pipelines",
          "Follow-up management",
          "Customer communication",
          "Sales tracking",
          "Support ticket management",
          "Automated notifications",
          "Customer analytics",
          "Business reporting"
        ],
        "blocks": [],
        "status": "Proposed Product"
      },
      {
        "title": "HEXVAULT Shield",
        "paragraphs": [
          "A cybersecurity-focused platform designed to help organizations understand and manage their digital security posture.",
          "Planned features include:"
        ],
        "items": [
          "Security dashboards",
          "Authorized vulnerability management",
          "Digital asset management",
          "Security reporting",
          "Risk assessment",
          "Security alerts",
          "Compliance tracking",
          "Security recommendations",
          "Security activity monitoring"
        ],
        "blocks": [],
        "status": "Proposed Product"
      },
      {
        "title": "HEXVAULT Intelligence",
        "paragraphs": [
          "An artificial intelligence ecosystem designed to improve business productivity and intelligent automation.",
          "Planned features include:"
        ],
        "items": [
          "AI business assistants",
          "AI-powered customer support",
          "Document analysis",
          "Knowledge management",
          "Intelligent search",
          "Workflow automation",
          "Intelligent reporting",
          "Business data analysis",
          "AI-powered recommendations",
          "Custom AI integrations"
        ],
        "blocks": [],
        "status": "Proposed Product"
      },
      {
        "title": "HEXVAULT Desk",
        "paragraphs": [
          "A centralized customer support and service management platform.",
          "Planned features include:"
        ],
        "items": [
          "Support ticket management",
          "Customer communication",
          "Support team management",
          "Ticket assignments",
          "Knowledge base",
          "Automated notifications",
          "Support analytics",
          "AI-assisted customer support",
          "Customer feedback management"
        ],
        "blocks": [],
        "status": "Proposed Product"
      },
      {
        "title": "HEXVAULT Deploy",
        "paragraphs": [
          "A software distribution, licensing and deployment platform designed to simplify application installation and management.",
          "Planned features include:"
        ],
        "items": [
          "Command-line application installation",
          "Software license management",
          "Subscription validation",
          "Local application deployment",
          "Version management",
          "Application updates",
          "Feature-based access control",
          "Installation management",
          "Deployment automation",
          "Application configuration"
        ],
        "blocks": [],
        "status": "Proposed Product"
      },
      {
        "title": "HEXVAULT Learn",
        "paragraphs": [
          "A technology education and professional development initiative focused on practical learning and industry-relevant skills.",
          "Planned offerings include:"
        ],
        "items": [
          "Programming fundamentals",
          "Frontend development",
          "Backend development",
          "Full-stack development",
          "Mobile application development",
          "Cybersecurity fundamentals",
          "Software testing",
          "UI/UX design",
          "Artificial intelligence fundamentals",
          "Project-based learning",
          "Technical workshops",
          "Mentorship",
          "Professional development"
        ],
        "blocks": [],
        "status": "Proposed Initiative"
      }
    ]
  },
  "expertise": {
    "title": "Our Expertise",
    "paragraphs": [
      "HEXVAULT's expertise section represents its current technical focus and planned areas of capability development."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Software Engineering",
        "paragraphs": [],
        "items": [
          "Frontend development",
          "Backend development",
          "Full-stack development",
          "Mobile application development",
          "Software architecture",
          "API engineering",
          "Database engineering",
          "Enterprise software development",
          "SaaS architecture"
        ],
        "blocks": []
      },
      {
        "title": "Cybersecurity",
        "paragraphs": [],
        "items": [
          "Secure software development",
          "Application security",
          "Vulnerability management",
          "Digital risk management",
          "Security awareness",
          "Security architecture"
        ],
        "blocks": []
      },
      {
        "title": "Artificial Intelligence",
        "paragraphs": [],
        "items": [
          "AI application integration",
          "Machine learning",
          "Natural language processing",
          "Intelligent automation",
          "AI-powered business solutions",
          "Intelligent agents"
        ],
        "blocks": []
      },
      {
        "title": "Cloud and Infrastructure",
        "paragraphs": [],
        "items": [
          "Cloud computing",
          "DevOps",
          "Application deployment",
          "Database infrastructure",
          "Infrastructure automation",
          "Application monitoring",
          "Continuous integration and deployment"
        ],
        "blocks": []
      },
      {
        "title": "Design and Product Engineering",
        "paragraphs": [],
        "items": [
          "UI/UX design",
          "Product design",
          "Design systems",
          "Prototyping",
          "Responsive design",
          "Product development",
          "User experience optimization"
        ],
        "blocks": []
      },
      {
        "title": "Business Technology",
        "paragraphs": [],
        "items": [
          "Enterprise resource planning",
          "Customer relationship management",
          "Workforce management",
          "Business automation",
          "E-commerce systems",
          "Inventory management",
          "Business intelligence"
        ],
        "blocks": []
      },
      {
        "title": "Quality Engineering",
        "paragraphs": [],
        "items": [
          "Software testing",
          "Quality assurance",
          "Test automation",
          "Performance evaluation",
          "Technical documentation",
          "Software reliability"
        ],
        "blocks": []
      }
    ]
  },
  "technologies": {
    "title": "Technologies We Explore and Work With",
    "paragraphs": [
      "Our technology ecosystem includes current and planned capabilities. Technologies are selected based on individual project requirements."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Programming Languages",
        "paragraphs": [],
        "items": [
          "JavaScript",
          "TypeScript",
          "Python",
          "Java",
          "C",
          "C++",
          "Dart",
          "SQL"
        ],
        "blocks": []
      },
      {
        "title": "Frontend Technologies",
        "paragraphs": [],
        "items": [
          "React",
          "Next.js",
          "HTML5",
          "CSS3",
          "Tailwind CSS",
          "Bootstrap",
          "Responsive web technologies"
        ],
        "blocks": []
      },
      {
        "title": "Backend Technologies",
        "paragraphs": [],
        "items": [
          "Node.js",
          "Express.js",
          "Python",
          "FastAPI",
          "Django",
          "Java",
          "Spring Boot",
          "REST APIs",
          "WebSockets"
        ],
        "blocks": []
      },
      {
        "title": "Mobile Technologies",
        "paragraphs": [],
        "items": [
          "Flutter",
          "Dart",
          "React Native",
          "Android development",
          "iOS development"
        ],
        "blocks": []
      },
      {
        "title": "Database Technologies",
        "paragraphs": [],
        "items": [
          "PostgreSQL",
          "MySQL",
          "MongoDB",
          "Redis",
          "Firebase",
          "Supabase",
          "Prisma ORM"
        ],
        "blocks": []
      },
      {
        "title": "Cloud and Infrastructure",
        "paragraphs": [],
        "items": [
          "Amazon Web Services",
          "Microsoft Azure",
          "Google Cloud",
          "Vercel",
          "Render",
          "Cloudflare",
          "Docker",
          "Kubernetes",
          "Linux",
          "Nginx"
        ],
        "blocks": []
      },
      {
        "title": "Artificial Intelligence",
        "paragraphs": [],
        "items": [
          "Large language models",
          "AI APIs",
          "Machine learning frameworks",
          "TensorFlow",
          "PyTorch",
          "Intelligent automation frameworks",
          "Natural language processing technologies"
        ],
        "blocks": []
      },
      {
        "title": "Development and Collaboration Tools",
        "paragraphs": [
          "Technology selection depends on project requirements, security, scalability, performance and maintainability."
        ],
        "items": [
          "Git",
          "GitHub",
          "GitHub Actions",
          "Figma",
          "Postman",
          "Visual Studio Code",
          "API documentation tools",
          "Project management tools"
        ],
        "blocks": []
      }
    ]
  },
  "industries": {
    "title": "Industries We Aim to Serve",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "Restaurants and Hospitality",
        "paragraphs": [
          "Restaurant ERP, digital menus, QR ordering, billing, inventory and operational management."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Retail and Wholesale",
        "paragraphs": [
          "Inventory management, billing, sales tracking, warehouse management and digital commerce."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "E-Commerce",
        "paragraphs": [
          "Online storefronts, marketplaces, product management and order processing."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Education",
        "paragraphs": [
          "Learning platforms, student management, administrative systems and educational technology."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Healthcare Administration",
        "paragraphs": [
          "Appointment management, administrative workflows and operational software, subject to applicable privacy and regulatory requirements."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Information Technology",
        "paragraphs": [
          "Software development, infrastructure management, automation and digital security."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Logistics and Supply Chain",
        "paragraphs": [
          "Inventory tracking, warehouse management, order processing and operational management."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Manufacturing",
        "paragraphs": [
          "Production management, inventory systems, workflow automation and operational reporting."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Professional Services",
        "paragraphs": [
          "Customer management, project management, document management and business automation."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Startups",
        "paragraphs": [
          "Product development, MVP development, technical planning and scalable application architecture."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Small and Medium-Sized Businesses",
        "paragraphs": [
          "Affordable and adaptable digital solutions designed to support business growth."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Enterprise Organizations",
        "paragraphs": [
          "Customized software platforms, enterprise integration and operational management systems."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Real Estate",
        "paragraphs": [
          "Property management, customer management and digital business platforms."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "research": {
    "title": "Research and Development",
    "paragraphs": [
      "HEXVAULT aims to establish a dedicated research and development division focused on emerging technologies, experimental software and practical innovation."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Research Areas",
        "paragraphs": [],
        "items": [
          "Artificial intelligence",
          "Machine learning",
          "Cybersecurity",
          "Cloud computing",
          "Distributed systems",
          "Intelligent agents",
          "Software engineering",
          "Business automation",
          "Internet of Things",
          "Privacy-focused technologies",
          "Digital infrastructure",
          "Human-computer interaction",
          "Data engineering",
          "Emerging computing technologies"
        ],
        "blocks": []
      },
      {
        "title": "Research Objectives",
        "paragraphs": [
          "Research findings, experimental projects and technical publications may be shared through the HEXVAULT website in the future."
        ],
        "items": [
          "Explore emerging technologies.",
          "Develop experimental prototypes.",
          "Identify practical technology applications.",
          "Improve existing software solutions.",
          "Encourage technical experimentation.",
          "Support knowledge sharing.",
          "Develop innovative digital products.",
          "Promote responsible technological advancement."
        ],
        "blocks": []
      }
    ],
    "status": "Planned Initiative"
  },
  "process": {
    "title": "Our Development Process",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "Stage 1 — Discovery",
        "paragraphs": [
          "Understanding the client's requirements, business challenges, expectations and objectives."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 2 — Requirement Analysis",
        "paragraphs": [
          "Identifying functional requirements, technical requirements, constraints and project scope."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 3 — Planning",
        "paragraphs": [
          "Defining development milestones, responsibilities, architecture and estimated timelines."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 4 — UI/UX Design",
        "paragraphs": [
          "Creating wireframes, prototypes, design systems and user interfaces."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 5 — Development",
        "paragraphs": [
          "Building the application using suitable technologies and structured engineering practices."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 6 — Integration",
        "paragraphs": [
          "Connecting application components, databases, APIs and third-party services."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 7 — Testing",
        "paragraphs": [
          "Evaluating functionality, usability, performance, compatibility and relevant security controls."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 8 — Deployment",
        "paragraphs": [
          "Preparing and releasing the application into its intended environment."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 9 — Maintenance",
        "paragraphs": [
          "Providing agreed technical support, updates, improvements and maintenance."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Stage 10 — Continuous Improvement",
        "paragraphs": [
          "Evaluating feedback and identifying opportunities to improve the product over time."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "engineering": {
    "title": "Our Engineering Principles",
    "paragraphs": [
      "HEXVAULT aims to follow responsible and maintainable software engineering practices.",
      "Our principles include:"
    ],
    "items": [
      "Security-focused development",
      "Modular software architecture",
      "Maintainable code",
      "Appropriate documentation",
      "Version control",
      "Structured development workflows",
      "Code review",
      "Software testing",
      "Scalable architecture",
      "Responsive design",
      "Accessibility",
      "Performance optimization",
      "Data protection",
      "Continuous improvement"
    ],
    "blocks": []
  },
  "why": {
    "title": "Why HEXVAULT?",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "Technology with Purpose",
        "paragraphs": [
          "We focus on developing solutions that address practical business requirements."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Security-Focused Approach",
        "paragraphs": [
          "We aim to consider security and privacy throughout the development process."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Customized Solutions",
        "paragraphs": [
          "Our solutions are designed around individual business requirements rather than a single universal approach."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Modern Engineering",
        "paragraphs": [
          "We explore modern technologies and development practices to build reliable software."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Scalability",
        "paragraphs": [
          "We consider future business growth and changing requirements when designing applications."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Transparency",
        "paragraphs": [
          "We aim to maintain clear communication regarding project scope, development progress and expectations."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Continuous Innovation",
        "paragraphs": [
          "We continuously explore new technologies and opportunities for improvement."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Long-Term Vision",
        "paragraphs": [
          "Our objective is to build sustainable technology products and meaningful business relationships."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "engagements": {
    "title": "Business Engagement Models",
    "paragraphs": [
      "HEXVAULT aims to support different business requirements through flexible engagement models."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Custom Project Development",
        "paragraphs": [
          "Software developed according to specific customer requirements and agreed project scope."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Subscription-Based Products",
        "paragraphs": [
          "Access to HEXVAULT software products through subscription-based models."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Enterprise Solutions",
        "paragraphs": [
          "Customized platforms designed around organizational requirements."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Software Licensing",
        "paragraphs": [
          "Software access through defined licensing and usage agreements."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Technology Consulting",
        "paragraphs": [
          "Technical guidance, architecture planning and technology evaluation."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Maintenance and Support",
        "paragraphs": [
          "Ongoing technical support and application maintenance according to agreed terms."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Technology Partnerships",
        "paragraphs": [
          "Long-term collaboration with businesses and technology organizations."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "MVP Development",
        "paragraphs": [
          "Helping startups transform early-stage product ideas into functional minimum viable products."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "careers": {
    "title": "Careers at HEXVAULT",
    "paragraphs": [
      "Build. Learn. Collaborate. Innovate.",
      "HEXVAULT aims to create an environment where aspiring professionals can develop practical skills, collaborate with teams and contribute to meaningful technology projects."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Career Areas",
        "paragraphs": [],
        "items": [
          "Frontend development",
          "Backend development",
          "Full-stack development",
          "Mobile application development",
          "UI/UX design",
          "Software testing",
          "Quality assurance",
          "Cybersecurity",
          "Artificial intelligence",
          "Machine learning",
          "Cloud computing",
          "DevOps",
          "Data analytics",
          "Research and development",
          "Human resources",
          "Project management",
          "Product management",
          "Business development",
          "Marketing",
          "Technical documentation"
        ],
        "blocks": []
      },
      {
        "title": "Internship Opportunities",
        "paragraphs": [
          "Our internship initiatives are intended to provide practical exposure to software development, professional collaboration and technology projects.",
          "Potential internship benefits include:",
          "Internship duration, responsibilities, eligibility, compensation arrangements and completion requirements will be clearly communicated in each opportunity listing."
        ],
        "items": [
          "Practical project experience",
          "Team collaboration",
          "Technical skill development",
          "Professional communication",
          "Exposure to development workflows",
          "Performance feedback",
          "Mentorship where available",
          "Internship completion documentation, subject to applicable requirements"
        ],
        "blocks": []
      },
      {
        "title": "Professional Development",
        "paragraphs": [
          "HEXVAULT aims to encourage continuous learning, technical improvement and professional responsibility.",
          "Future opportunities may include workshops, technical sessions, mentorship programs and project-based learning."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "teams": {
    "title": "Our Teams and Departments",
    "paragraphs": [
      "HEXVAULT aims to establish specialized teams as its operations and capabilities expand."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Leadership and Management",
        "paragraphs": [
          "Responsible for organizational strategy, business planning and operational coordination."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Software Engineering",
        "paragraphs": [
          "Responsible for frontend, backend, mobile and enterprise application development."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Product Engineering",
        "paragraphs": [
          "Responsible for product planning, architecture, feature development and product improvement."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Design",
        "paragraphs": [
          "Responsible for user interface design, user experience and visual consistency."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Quality Assurance",
        "paragraphs": [
          "Responsible for software testing, bug reporting and quality evaluation."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Cybersecurity",
        "paragraphs": [
          "A planned division focused on digital security and responsible security assessments."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Artificial Intelligence",
        "paragraphs": [
          "A planned division focused on intelligent systems, AI integration and automation."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Cloud and Infrastructure",
        "paragraphs": [
          "Responsible for application deployment, infrastructure and operational reliability as capabilities expand."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Research and Development",
        "paragraphs": [
          "A planned division focused on emerging technologies and experimental projects."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Human Resources",
        "paragraphs": [
          "Responsible for recruitment, onboarding, organizational coordination and workforce administration."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Business Development and Marketing",
        "paragraphs": [
          "Responsible for business opportunities, customer engagement, partnerships and brand development."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Customer Support",
        "paragraphs": [
          "Responsible for assisting customers with product-related and technical enquiries as services become available."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "partnerships": {
    "title": "Partnerships and Collaborations",
    "paragraphs": [
      "HEXVAULT welcomes opportunities to collaborate with individuals and organizations that share an interest in technology and innovation.",
      "Potential collaborations include:",
      "Our objective is to establish mutually beneficial relationships that support innovation, knowledge sharing and sustainable growth."
    ],
    "items": [
      "Startups",
      "Technology companies",
      "Educational institutions",
      "Research organizations",
      "Independent developers",
      "Business organizations",
      "Industry professionals",
      "Software service providers",
      "Cloud service providers",
      "Technology communities"
    ],
    "blocks": []
  },
  "security": {
    "title": "Security and Privacy",
    "paragraphs": [
      "HEXVAULT recognizes the importance of protecting customer information, business data and digital infrastructure.",
      "Our intended security principles include:",
      "Specific security controls and privacy practices will depend on the individual product, service and applicable requirements.",
      "HEXVAULT does not claim that any software system is completely immune to security risks."
    ],
    "items": [
      "Secure software development",
      "Appropriate access control",
      "Secure authentication",
      "Data privacy",
      "Appropriate encryption",
      "Data minimization",
      "Responsible data management",
      "Security testing",
      "Responsible vulnerability disclosure",
      "Continuous security improvement",
      "Backup and recovery planning"
    ],
    "blocks": []
  },
  "resources": {
    "title": "Resources and Knowledge Centre",
    "paragraphs": [
      "The HEXVAULT resource centre aims to provide useful information about technology, software development and digital innovation."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Technical Blog",
        "paragraphs": [
          "Articles covering software engineering, cybersecurity, artificial intelligence, business automation and emerging technologies."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Product Documentation",
        "paragraphs": [
          "Guides explaining product features, configuration, installation and usage."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Developer Documentation",
        "paragraphs": [
          "API references, integration guides and technical resources where applicable."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Tutorials",
        "paragraphs": [
          "Practical learning resources covering programming, development tools and software technologies."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Case Studies",
        "paragraphs": [
          "Documentation of completed projects and their outcomes, subject to client permission."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Research Publications",
        "paragraphs": [
          "Technical findings, experimental projects and research articles."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Frequently Asked Questions",
        "paragraphs": [
          "Answers to common questions regarding products, services and technical support."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Product Updates",
        "paragraphs": [
          "Announcements about new features, releases, improvements and upcoming products."
        ],
        "items": [],
        "blocks": []
      }
    ],
    "status": "Planned and Expanding"
  },
  "roadmap": {
    "title": "Our Roadmap",
    "paragraphs": [
      "HEXVAULT aims to expand progressively through product development, service expansion and responsible business growth."
    ],
    "items": [],
    "blocks": [
      {
        "title": "Phase 1 — Establishing the Foundation",
        "paragraphs": [],
        "items": [
          "Establish brand identity.",
          "Develop the corporate website.",
          "Build software development capabilities.",
          "Establish development teams.",
          "Develop internal management processes.",
          "Continue existing product development."
        ],
        "blocks": []
      },
      {
        "title": "Phase 2 — Product Development and Launch",
        "paragraphs": [],
        "items": [
          "Complete Restaurant ERP development.",
          "Continue Workforce OS development.",
          "Conduct product testing.",
          "Prepare product documentation.",
          "Establish customer onboarding processes.",
          "Introduce product support systems."
        ],
        "blocks": []
      },
      {
        "title": "Phase 3 — Service Expansion",
        "paragraphs": [],
        "items": [
          "Expand custom software development.",
          "Strengthen mobile application development.",
          "Expand enterprise solutions.",
          "Develop cloud and DevOps capabilities.",
          "Introduce business automation solutions.",
          "Establish additional quality assurance processes."
        ],
        "blocks": []
      },
      {
        "title": "Phase 4 — Emerging Technologies",
        "paragraphs": [],
        "items": [
          "Establish cybersecurity capabilities.",
          "Develop AI-powered applications.",
          "Introduce intelligent automation.",
          "Establish research and development initiatives.",
          "Explore additional software products."
        ],
        "blocks": []
      },
      {
        "title": "Phase 5 — Long-Term Growth",
        "paragraphs": [
          "Roadmap objectives are subject to available resources, development progress and business requirements."
        ],
        "items": [
          "Expand into international markets.",
          "Develop strategic partnerships.",
          "Introduce interconnected enterprise platforms.",
          "Establish professional development initiatives.",
          "Expand organizational capabilities.",
          "Build a sustainable technology ecosystem."
        ],
        "blocks": []
      }
    ]
  },
  "global": {
    "title": "Global Technology Services",
    "paragraphs": [
      "HEXVAULT aims to support businesses beyond geographical boundaries through remote software development, digital collaboration and technology services.",
      "Our long-term objectives include:",
      "International engagements will be subject to applicable legal, contractual and regulatory requirements."
    ],
    "items": [
      "Supporting domestic and international clients.",
      "Developing software for different industries.",
      "Establishing remote technology partnerships.",
      "Delivering digital products across multiple markets.",
      "Supporting international software service requirements.",
      "Expanding our global technology presence."
    ],
    "blocks": []
  },
  "commitment": {
    "title": "Our Commitment",
    "paragraphs": [
      "HEXVAULT is committed to developing technology with purpose, responsibility and a long-term vision.",
      "We aim to maintain a culture of continuous improvement, professional ethics, technical excellence and transparent communication.",
      "Our objective is not simply to build software but to create solutions that deliver meaningful value.",
      "As HEXVAULT continues to evolve, our products, services and capabilities will expand according to technological opportunities, customer requirements and organizational growth."
    ],
    "items": [],
    "blocks": []
  },
  "faq": {
    "title": "Frequently Asked Questions",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "What is HEXVAULT?",
        "paragraphs": [
          "HEXVAULT is an emerging technology company focused on software development, digital products, business automation, cybersecurity and artificial intelligence."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "What services does HEXVAULT provide?",
        "paragraphs": [
          "HEXVAULT focuses on custom software development, web development, backend engineering, UI/UX design, enterprise software, SaaS development and business automation, with additional services planned for future expansion."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Does HEXVAULT develop its own products?",
        "paragraphs": [
          "Yes. HEXVAULT is developing independent software products, including Restaurant ERP and Workforce OS, while exploring additional product opportunities."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Are all HEXVAULT products available?",
        "paragraphs": [
          "No. Some products are currently in development, while others are proposed or planned for future release."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Does HEXVAULT develop custom software?",
        "paragraphs": [
          "HEXVAULT aims to develop customized software according to individual business requirements and available technical capabilities."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Does HEXVAULT provide cybersecurity services?",
        "paragraphs": [
          "Cybersecurity is part of HEXVAULT's planned service expansion. Availability will be announced as the required capabilities are established."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Does HEXVAULT provide artificial intelligence solutions?",
        "paragraphs": [
          "Artificial intelligence integration and intelligent automation are part of HEXVAULT's current exploration and future development plans."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Does HEXVAULT offer internships?",
        "paragraphs": [
          "Internship opportunities may be announced according to organizational requirements and available projects."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Can international businesses work with HEXVAULT?",
        "paragraphs": [
          "HEXVAULT welcomes international business enquiries. Project acceptance depends on technical feasibility, availability and applicable requirements."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Does HEXVAULT provide software maintenance?",
        "paragraphs": [
          "Maintenance and technical support may be provided according to individual project agreements."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "How can I contact HEXVAULT?",
        "paragraphs": [
          "You can contact HEXVAULT through our official email address or LinkedIn company page."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "contact": {
    "title": "Contact Us",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "Let's Build Something Meaningful.",
        "paragraphs": [
          "Have a software idea, business challenge or technology requirement?",
          "Connect with HEXVAULT to explore how technology can transform your ideas into practical digital solutions."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Business Enquiries",
        "paragraphs": [
          "Contact us regarding custom software development, enterprise solutions and technology projects."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Product Enquiries",
        "paragraphs": [
          "Learn more about existing products, upcoming platforms and product development progress."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Partnership Enquiries",
        "paragraphs": [
          "Explore business collaborations, technology partnerships and joint development opportunities."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Career Enquiries",
        "paragraphs": [
          "Explore available internships, professional opportunities and future openings."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Technical Support",
        "paragraphs": [
          "Contact us regarding supported products and existing project requirements."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Official Contact Information",
        "paragraphs": [
          "Company: HEXVAULT",
          "Industry: Software Development & Information Technology",
          "Email: contact.hexvault@gmail.com",
          "LinkedIn: https://www.linkedin.com/company/hex-vault/"
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "cta": {
    "title": "Website Call-to-Action Content",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "Build Your Next Idea With HEXVAULT",
        "paragraphs": [
          "Transform your business requirements into practical digital solutions."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Explore Our Products",
        "paragraphs": [
          "Discover the software platforms we are building for businesses and organizations."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Discover Our Services",
        "paragraphs": [
          "Explore our technology services and future capabilities."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Work With Us",
        "paragraphs": [
          "Collaborate with HEXVAULT on technology projects and business opportunities."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Join Our Team",
        "paragraphs": [
          "Explore professional opportunities and contribute to meaningful technology projects."
        ],
        "items": [],
        "blocks": []
      },
      {
        "title": "Get in Touch",
        "paragraphs": [
          "Connect with us to discuss your ideas, requirements and technology challenges."
        ],
        "items": [],
        "blocks": []
      }
    ]
  },
  "footer": {
    "title": "Website Footer",
    "paragraphs": [],
    "items": [],
    "blocks": [
      {
        "title": "HEXVAULT",
        "paragraphs": [
          "SECURE • BUILD • INNOVATE",
          "Delivering Solutions.",
          "Building secure, scalable and innovative technology solutions for a digital future."
        ],
        "items": [],
        "blocks": [
          {
            "title": "Company",
            "paragraphs": [],
            "items": [
              "About Us",
              "Our Purpose",
              "Our Vision",
              "Our Mission",
              "Our Values",
              "Our Teams",
              "Careers",
              "Contact"
            ],
            "blocks": []
          },
          {
            "title": "Services",
            "paragraphs": [],
            "items": [
              "Software Development",
              "Web Development",
              "Mobile Development",
              "UI/UX Design",
              "Enterprise Solutions",
              "Business Automation",
              "Cybersecurity",
              "Artificial Intelligence",
              "Cloud and DevOps",
              "IT Consulting"
            ],
            "blocks": []
          },
          {
            "title": "Products",
            "paragraphs": [],
            "items": [
              "HEXVAULT Restaurant ERP",
              "HEXVAULT Workforce OS",
              "HEXVAULT Commerce",
              "HEXVAULT CRM",
              "HEXVAULT Shield",
              "HEXVAULT Intelligence",
              "HEXVAULT Desk",
              "HEXVAULT Deploy",
              "HEXVAULT Learn"
            ],
            "blocks": []
          },
          {
            "title": "Resources",
            "paragraphs": [],
            "items": [
              "Blog",
              "Documentation",
              "Developer Resources",
              "Research",
              "Case Studies",
              "Product Updates",
              "FAQs",
              "Help Centre"
            ],
            "blocks": []
          },
          {
            "title": "Legal",
            "paragraphs": [],
            "items": [
              "Privacy Policy",
              "Terms of Service",
              "Cookie Policy",
              "Security Policy",
              "Acceptable Use Policy",
              "Responsible Disclosure Policy"
            ],
            "blocks": []
          },
          {
            "title": "Connect",
            "paragraphs": [
              "Email: contact.hexvault@gmail.com",
              "LinkedIn: https://www.linkedin.com/company/hex-vault/",
              "© 2026 HEXVAULT. All rights reserved."
            ],
            "items": [],
            "blocks": []
          }
        ]
      }
    ]
  },
  "availability": {
    "title": "Product and Service Availability Disclaimer",
    "paragraphs": [
      "HEXVAULT is an emerging technology initiative.",
      "Certain products, services, departments, technologies and research initiatives described on this website are currently under development, proposed or planned for future introduction.",
      "Descriptions of upcoming capabilities represent intended development objectives and do not constitute guarantees of availability, release dates or final functionality.",
      "Product features, service offerings and development plans may change according to technical feasibility, organizational resources, business requirements and development progress.",
      "Customers and business partners are encouraged to contact HEXVAULT to confirm current service availability and project requirements."
    ],
    "items": [],
    "blocks": []
  }
};
