import Icon from '../icons/Icon.jsx';

export default function FAB({ icon = 'plus', onClick, ariaLabel = 'Add' }) {
  return (
    <button className="fab" onClick={onClick} aria-label={ariaLabel}>
      <Icon name={icon} size={22} strokeWidth={2.3} />
    </button>
  );
}
