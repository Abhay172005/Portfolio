/* The resume as it was written into resume.html before it became editable. The dashboard starts from
   this until the resume is first saved; the public page shows the same content in its HTML.
   **text** in bullets is shown in bold. */
module.exports = {
  education: [
    {
      title: "SRM Institute of Science and Technology",
      org: "B.Tech in Computer Science and Engineering",
      date: "Expected May 2028",
      place: "Chennai, India",
      chips: ["Data Structures & Algorithms", "Database Management Systems", "Operating Systems", "Computer Networks"]
    }
  ],
  experience: [
    {
      title: "Deep Learning Intern — Video Deepfake Detection",
      org: "Computer Vision & Biometrics Lab (CVBL), IIIT Allahabad",
      date: "June 2026",
      place: "",
      bullets: [
        "Built a video-level deepfake detector in PyTorch (**EfficientNet-B0 + GRU**, 5.3M params) over 8 face crops per video, trained on FaceForensics++ (8,640 videos, 5 manipulation methods, C23 & C40), reaching **0.91 test ROC-AUC**.",
        "Built the preprocessing pipeline with OpenCV YuNet face detection, face tracking, and 224×224 face cropping, and deployed the model as a React + FastAPI web demo for video inference.",
        "Ran robustness experiments with paired C23/C40 fine-tuning and chained degradation augmentation, raising AUC on JPEG-compressed + downsampled video from **0.745 to 0.794** (single run).",
        "Evaluated on **6,862 unseen DFD videos** and real H.264 re-encoding (CRF 28 & 35) with bootstrap 95% CIs (2,000 resamples) and a 3-seed study, showing a single-run DFD gain did not replicate across seeds."
      ],
      links: [
        { label: "Project write-up", url: "project.html?p=robust-deepfake-detection" },
        { label: "Source", url: "https://github.com/Abhay172005/robust-deepfake-detection" }
      ]
    }
  ],
  certifications: [
    { title: "Geodata Processing using Python and Machine Learning", org: "ISRO — IIRS · A+ Grade" },
    { title: "Certified Generative AI Professional · AI Foundations Associate", org: "Oracle Cloud Infrastructure 2025" },
    { title: "SAP Generative AI Developer", org: "SAP Certified" }
  ],
  activities: [
    { title: "Corporate Member", org: "FOSS Club — SRMIST", date: "", place: "Chennai, India" }
  ],
  skills: [
    { label: "Languages", items: ["Python", "Java", "JavaScript"] },
    { label: "AI / ML", items: ["PyTorch", "OpenCV", "NumPy", "YOLOv8", "CNNs", "GRU", "Computer Vision"] },
    { label: "Frontend", items: ["React.js", "HTML", "CSS", "Tailwind CSS"] },
    { label: "Backend", items: ["Node.js", "Express.js", "Supabase"] },
    { label: "Databases", items: ["PostgreSQL", "MongoDB"] },
    { label: "Tools", items: ["Git", "GitHub", "VS Code", "Vercel"] }
  ]
};
