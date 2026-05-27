const roles = {
  frontend: {
    name: 'Frontend Engineer',
    requiredSkills: ['JavaScript', 'React', 'HTML', 'CSS'],
    minYearsExperience: 2,
    preferredSkills: ['TypeScript', 'Vue', 'Angular', 'State Management', 'Web Performance'],
    scoreThresholds: {
      interview: 50,
      reject: 0
    }
  },
  backend: {
    name: 'Backend Engineer',
    requiredSkills: ['Node.js', 'JavaScript', 'Database', 'API Design', 'Python'],
    minYearsExperience: 3,
    preferredSkills: ['Express', 'PostgreSQL', 'MongoDB', 'Microservices', 'Docker'],
    scoreThresholds: {
      interview: 50,
      reject: 0
    }
  },
  fullstack: {
    name: 'Full Stack Engineer',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'Database', 'HTML'],
    minYearsExperience: 3,
    preferredSkills: ['TypeScript', 'Express', 'MongoDB', 'PostgreSQL', 'Docker'],
    scoreThresholds: {
      interview: 50,
      reject: 0
    }
  },
  devops: {
    name: 'DevOps Engineer',
    requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD'],
    minYearsExperience: 3,
    preferredSkills: ['Terraform', 'Jenkins', 'GitLab CI', 'Monitoring', 'Infrastructure'],
    scoreThresholds: {
      interview: 50,
      reject: 0
    }
  },
  dataengineer: {
    name: 'Data Engineer',
    requiredSkills: ['Python', 'SQL', 'Database', 'Data Pipelines', 'ETL'],
    minYearsExperience: 2,
    preferredSkills: ['Apache Spark', 'Hadoop', 'Airflow', 'Data Warehouse', 'Cloud'],
    scoreThresholds: {
      interview: 50,
      reject: 0
    }
  }
};

module.exports = roles;
