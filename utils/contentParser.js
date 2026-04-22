/**
 * Content Parser Utility
 * Parses markdown, txt, and html files into room structure with lessons and questions
 */

/**
 * Content Parser Utility
 * Parses markdown, txt, and html files into THM-style room structure with sections and tasks
 */

export function parseMarkdownContent(content, config) {
  const sections = [];
  const questions = [];

  // Split by headers (## for sections, ### for tasks)
  const lines = content.split('\n');
  let currentSection = null;
  let currentTask = null;
  let sectionIndex = 0;
  let taskIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Section header (##)
    if (line.match(/^##\s+/)) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        title: line.replace(/^##\s+/, '').trim(),
        description: '',
        tasks: [],
        order: sectionIndex++
      };
      currentTask = null;
      taskIndex = 0;
    }
    // Task header (###)
    else if (line.match(/^###\s+/) && currentSection) {
      // Save previous task if exists
      if (currentTask) {
        currentSection.tasks.push(currentTask);
      }

      currentTask = {
        title: line.replace(/^###\s+/, '').trim(),
        description: '',
        content: '',
        questions: [],
        order: taskIndex++
      };
    }
    // Question marker
    else if ((line.trim().startsWith('Q:') || line.trim().startsWith('Question:')) && currentTask) {
      const questionText = line.substring(line.indexOf(':') + 1).trim();
      const question = parseQuestion(questionText, config.pointsPerQuestion);
      currentTask.questions.push(question);
      questions.push(question);
    }
    // Content for current task
    else if (currentTask && line.trim()) {
      currentTask.content += line + '\n';
    }
  }

  // Save last section and task
  if (currentTask && currentSection) {
    currentSection.tasks.push(currentTask);
  }
  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    sections,
    questions,
    modules: [] // Legacy support
  };
}

export function parseHTMLContent(content, config) {
  // Parse HTML and extract structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  const sections = [];
  const questions = [];

  const sectionElements = doc.querySelectorAll('h2');
  let sectionIndex = 0;

  sectionElements.forEach((sectionEl, sIndex) => {
    const sectionTitle = sectionEl.textContent || `Section ${sIndex + 1}`;
    const tasks = [];
    let taskIndex = 0;

    // Find all h3 elements within this section
    let nextElement = sectionEl.nextElementSibling;
    let currentTask = null;

    while (nextElement && nextElement.tagName !== 'H2') {
      if (nextElement.tagName === 'H3') {
        // Save previous task
        if (currentTask) {
          tasks.push(currentTask);
        }

        currentTask = {
          title: nextElement.textContent || `Task ${taskIndex + 1}`,
          description: '',
          content: '',
          questions: [],
          order: taskIndex++
        };
      } else if (currentTask) {
        // Check for questions
        const text = nextElement.textContent || '';
        if (text.match(/^(Q:|Question:)/i)) {
          const questionText = text.replace(/^(Q:|Question:)/i, '').trim();
          const question = parseQuestion(questionText, config.pointsPerQuestion);
          currentTask.questions.push(question);
          questions.push(question);
        } else {
          currentTask.content += text + '\n';
        }
      }

      nextElement = nextElement.nextElementSibling;
    }

    // Save last task
    if (currentTask) {
      tasks.push(currentTask);
    }

    sections.push({
      title: sectionTitle,
      description: '',
      tasks,
      order: sectionIndex++
    });
  });

  return {
    sections,
    questions,
    modules: [] // Legacy support
  };
}

export function parsePlainTextContent(content, config) {
  const sections = [];
  const questions = [];

  // Split by "SECTION:" or "==" markers
  const sectionBlocks = content.split(/SECTION:|---+|\n\s*\n/).filter(s => s.trim());
  let sectionIndex = 0;

  sectionBlocks.forEach((sectionBlock, sIndex) => {
    const lines = sectionBlock.trim().split('\n');
    const sectionTitle = lines[0].trim() || `Section ${sIndex + 1}`;
    const tasks = [];
    let taskIndex = 0;
    let currentTask = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Task marker (TASK: or ---)
      if (line.match(/^(TASK:|###)/i) || (line.includes('---') && !currentTask)) {
        if (currentTask) {
          tasks.push(currentTask);
        }

        currentTask = {
          title: line.replace(/^(TASK:|###)/i, '').replace(/---/, '').trim() || `Task ${taskIndex + 1}`,
          description: '',
          content: '',
          questions: [],
          order: taskIndex++
        };
      }
      // Question marker
      else if (line.match(/^Q\./i) && currentTask) {
        const questionText = line.replace(/^Q\./i, '').trim();
        const question = parseQuestion(questionText, config.pointsPerQuestion);
        currentTask.questions.push(question);
        questions.push(question);
      }
      // Content for current task
      else if (currentTask && line.trim()) {
        currentTask.content += line + '\n';
      }
    }

    // Save last task
    if (currentTask) {
      tasks.push(currentTask);
    }

    sections.push({
      title: sectionTitle,
      description: '',
      tasks,
      order: sectionIndex++
    });
  });

  return {
    sections,
    questions,
    modules: [] // Legacy support
  };
}

function parseContentBlocks(content) {
  const blocks = [];
  const lines = content.split('\n').filter(l => l.trim());

  lines.forEach(line => {
    if (line.match(/^#/)) {
      blocks.push({ type: 'header', content: line.replace(/^#+\s*/, '') });
    } else if (line.match(/^##/)) {
      blocks.push({ type: 'subheader', content: line.replace(/^#+\s*/, '') });
    } else if (line.match(/^-\s*\d+\s*points/i)) {
      blocks.push({ type: 'points', content: line, color: 'green' });
    } else if (line.match(/^>/)) {
      blocks.push({ type: 'highlight', content: line.replace(/^>\s*/, '') });
    } else if (line.trim()) {
      blocks.push({ type: 'text', content: line });
    }
  });

  return blocks;
}

function parseQuestion(questionText, defaultPoints) {
  // Extract question number, text, and answer hint
  const match = questionText.match(/(^Q\.?\s*\d*\.?\s*)?(.+?)(\s*a:(.+))?$/i);
  
  return {
    question: match ? match[2].trim() : questionText,
    hint: match && match[4] ? match[4].trim() : 'Check the content above',
    points: defaultPoints,
    answer: '', // To be filled by admin
    order: 0
  };
}

export function createRoomFromParsedContent(config, parsed) {
  return {
    title: config.title,
    description: config.description,
    category: config.category,
    difficulty: config.difficulty,
    roomType: config.roomType,
    isRoom: true,
    sections: parsed.sections,
    questions: parsed.questions,
    modules: parsed.modules, // Legacy support
    rewards: {
      badge: config.withBadge ? {
        name: `${config.title} Master`,
        icon: '🎖️',
        color: 'orange'
      } : null,
      certificate: config.withCertificate,
      pointsPerQuestion: config.pointsPerQuestion,
      totalPoints: parsed.questions.length * config.pointsPerQuestion
    },
    status: 'published'
  };
}

export function getParserForFileType(fileName) {
  if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
    return parseMarkdownContent;
  } else if (fileName.endsWith('.html')) {
    return parseHTMLContent;
  } else if (fileName.endsWith('.txt')) {
    return parsePlainTextContent;
  }
  return parseMarkdownContent; // Default
}
