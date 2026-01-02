import { helpCategories } from '../../helpData';
import HelpPage from '../../page';

export async function generateStaticParams() {
  const params: { category: string; section: string }[] = [];
  
  helpCategories.forEach((category) => {
    category.sections.forEach((section) => {
      params.push({
        category: category.id,
        section: section.id,
      });
    });
  });
  
  return params;
}

export default function SectionHelpPage() {
  return <HelpPage />;
}

