<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SSF_Content_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'ssf_content';
	}

	public function get_title() {
		return 'SSF Content Section';
	}

	public function get_icon() {
		return 'eicon-text-area';
	}

	public function get_categories() {
		return array( 'seo-social-factory' );
	}

	public function get_keywords() {
		return array( 'content', 'text', 'section', 'article', 'ssf' );
	}

	protected function register_controls() {

		// ── Content ──
		$this->start_controls_section( 'section_content', array(
			'label' => 'Content',
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );

		$this->add_control( 'heading', array(
			'label'       => 'Heading',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Why Choose Our Service',
			'label_block' => true,
		) );

		$this->add_control( 'heading_tag', array(
			'label'   => 'Heading Tag',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'default' => 'h2',
			'options' => array(
				'h2' => 'H2',
				'h3' => 'H3',
				'h4' => 'H4',
			),
		) );

		$this->add_control( 'body', array(
			'label'   => 'Body Content',
			'type'    => \Elementor\Controls_Manager::WYSIWYG,
			'default' => '<p>We deliver fast, reliable service you can count on. Our experienced team handles everything from start to finish so you can focus on what matters most.</p><p>With years of experience serving the local community, we understand exactly what our customers need — and we deliver every time.</p>',
		) );

		$this->end_controls_section();

		// ── Layout ──
		$this->start_controls_section( 'section_layout', array(
			'label' => 'Layout',
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );

		$this->add_control( 'max_width', array(
			'label'   => 'Max Width',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'default' => '780',
			'options' => array(
				'600'  => 'Narrow (600px)',
				'780'  => 'Medium (780px)',
				'960'  => 'Wide (960px)',
				'none' => 'Full Width',
			),
		) );

		$this->add_control( 'text_align', array(
			'label'   => 'Text Alignment',
			'type'    => \Elementor\Controls_Manager::CHOOSE,
			'options' => array(
				'left'   => array( 'title' => 'Left', 'icon' => 'eicon-text-align-left' ),
				'center' => array( 'title' => 'Center', 'icon' => 'eicon-text-align-center' ),
			),
			'default' => 'left',
		) );

		$this->end_controls_section();

		// ── Style ──
		$this->start_controls_section( 'section_style', array(
			'label' => 'Style',
			'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
		) );

		$this->add_control( 'heading_color', array(
			'label'   => 'Heading Color',
			'type'    => \Elementor\Controls_Manager::COLOR,
			'default' => '#1a1a2e',
		) );

		$this->add_control( 'text_color', array(
			'label'   => 'Text Color',
			'type'    => \Elementor\Controls_Manager::COLOR,
			'default' => '#475569',
		) );

		$this->add_control( 'bg_color', array(
			'label'   => 'Background Color',
			'type'    => \Elementor\Controls_Manager::COLOR,
			'default' => '',
		) );

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$tag       = in_array( $s['heading_tag'], array( 'h2', 'h3', 'h4' ), true ) ? $s['heading_tag'] : 'h2';
		$max_w     = $s['max_width'] !== 'none' ? 'max-width:' . intval( $s['max_width'] ) . 'px;' : '';
		$align     = $s['text_align'] === 'center' ? 'text-align:center;' : '';
		$bg        = ! empty( $s['bg_color'] ) ? 'background:' . esc_attr( $s['bg_color'] ) . ';' : '';
		$h_color   = esc_attr( $s['heading_color'] );
		$t_color   = esc_attr( $s['text_color'] );
		?>
		<div class="ssf-content" style="<?php echo $bg; ?>">
			<div class="ssf-content__inner" style="<?php echo $max_w . $align; ?>">
				<?php if ( ! empty( $s['heading'] ) ) : ?>
					<<?php echo $tag; ?> class="ssf-content__heading" style="color:<?php echo $h_color; ?>">
						<?php echo esc_html( $s['heading'] ); ?>
					</<?php echo $tag; ?>>
				<?php endif; ?>
				<?php if ( ! empty( $s['body'] ) ) : ?>
					<div class="ssf-content__body" style="color:<?php echo $t_color; ?>">
						<?php echo wp_kses_post( $s['body'] ); ?>
					</div>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}
}
