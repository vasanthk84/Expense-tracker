import Icon from '../icons/Icon.jsx';

/**
 * CategoryIcon — small rounded square containing an icon.
 * tone: default | primary | accent | danger
 */
export default function CategoryIcon({ icon, tone = 'default', size = 'md' }) {
  const cls = [
    'cat-icon',
    tone !== 'default' && tone,
    size === 'sm' && 'sm'
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
    </div>
  );
}
