import Icon from '../icons/Icon.jsx';

/**
 * SearchBar — search input with leading icon.
 */
export default function SearchBar({ placeholder = 'Search…', value, onChange }) {
  return (
    <div className="search-wrap">
      <span className="search-icon">
        <Icon name="search" size={15} />
      </span>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
