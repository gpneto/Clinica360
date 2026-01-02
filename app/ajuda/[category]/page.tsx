import { helpCategories } from '../helpData';
import HelpPage from '../page';

export async function generateStaticParams() {
  return helpCategories.map((category) => ({
    category: category.id,
  }));
}

export default function CategoryHelpPage() {
  return <HelpPage />;
}

